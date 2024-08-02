async function fetchData() {
    const data = await d3.csv("https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv", function(d) {
        return {
            date: new Date(d.date),
            state: d.state,
            cases: +d.cases,
            deaths: +d.deaths
        }
    })

    return data
}

async function yearSortedData() {
    const data = await fetchData()

    const group = d3.group(data, d => d.date.getFullYear(), d => d.state)
    const years = Array.from(group, ([year, states]) => ({
        year: year,
        states: Array.from(states, ([state, cases]) => ({
            state: state,
            cases: d3.max(cases, d => d.cases)
        }))
    }))

    return years
}

async function TotalSortedData() {
    const data = await fetchData()

    const group = d3.group(data, d => d.state)
    const states = Array.from(group, ([state, cases]) => ({
        state: state,
        cases: d3.max(cases, d => d.cases)
    }))

    return states
}

async function sceneBarCharts() {
//bar charts
    const _data = await yearSortedData()
    const group = []
    _data.forEach(item => {
        group.push(item.states.sort((a, b) => b.cases - a.cases).slice(0, 10))
    })

    const margin = 20
    const width = 975
    const height = 610


    const scene = d3.select("#scene3").select('.chart')
    const svg = scene.append('svg').attr("width", width + 150).attr("height", height + 50)

    function sceneTwo_helper(i) {
        const years = group[i]
        const x_cases = d3.scaleLinear().domain([0, d3.max(years, d => d.cases)]).range([0, width])
        const y_cases = d3.scaleBand().domain(years.map(d => d.state)).range([0, height])

        svg.selectAll("*").remove()
    
        svg.append("g").attr("class", "x axis").attr("transform", `translate(${margin},${height + margin})`).call(d3.axisBottom(x_cases).ticks(4))
        svg.append("g").attr("class", "y axis").attr("transform", `translate(${margin},${margin})`).call(d3.axisRight(y_cases).ticks(10))
        
        svg.append("text").attr("class", "x label").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height - 6 + margin).text("Number of COVID-19 Cases")
        svg.append("text").attr("class", "y label").attr("text-anchor", "end").attr("x", -width / 4).attr("y", 6).attr("dy", ".75em").attr("transform", "rotate(-90)").text("State")

        const tooltip = d3.select(".chart").append("div").attr("class", "tooltip_bar").style("visibility", "hidden")

        svg.selectAll(".bar").data(years).enter().append("rect").attr("class", "bar").attr("x", 0).attr("y", d => y_cases(d.state)).attr("width", d => x_cases(d.cases))
        .attr("height", y_cases.bandwidth() - 2 * margin).attr("transform", `translate(${margin},${margin})`).style("fill", "red")
        .on("mouseover", function(event, d) {
            d3.select(this).style("fill", "black")
            tooltip.style("visibility", "visible").text("Cases: " + years.find((state) => state.state == d.state).cases.toLocaleString())
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px")
        })
        .on("mouseout", function() {
            d3.select(this).style("fill", "red")
            tooltip.style("visibility", "hidden")
        })
    }

    sceneTwo_helper(0)

    d3.selectAll("#clickMe").on("click", function() {
        sceneTwo_helper(this.value)
    })
}

async function sceneLineGraphs() {
//time wise line graphs 
    const _data = await fetchData()
    const states = [...new Set(_data.map(d => d.state))].sort()
    d3.select("#stateSelect").selectAll("option").data(states).enter().append("option").attr("value", d => d.value).text(d => d)

    const margin = 20
    const width = 975
    const height = 610

    const scene = d3.select("#scene4").select('.chart')
    const svg = scene.append('svg').attr("width", width + 150).attr("height", height + 50)

    function sceneThree_helper(state) {
        const state_data = _data.filter(d => d.state == state)
    
        const x_both = d3.scaleTime().range([0, width]).domain(d3.extent(state_data, d => d.date))
        const y_cases = d3.scaleLinear().range([height, 0]).domain([0, d3.max(state_data, d => d.cases)])
        const y_deaths = d3.scaleLinear().range([height, 0]).domain([0, d3.max(state_data, d => d.deaths)])

        const line = d3.line().x(d => x_both(d.date)).y(d => y_cases(d.cases))
        const lineDeaths = d3.line().x(d => x_both(d.date)).y(d => y_deaths(d.deaths))
    
        svg.selectAll("*").remove()
    
        svg.append("path").data([state_data]).attr("class", "line").attr("d", line).attr("stroke", "steelblue").attr("transform", `translate(${margin},${margin})`)
        svg.append("path").data([state_data]).attr("class", "line").attr("d", lineDeaths).attr("stroke", "red").attr("transform", `translate(${margin},${margin})`)

    
        svg.append("g").attr("class", "x axis").attr("transform", `translate(${margin},${height + margin})`).call(d3.axisBottom(x_both).ticks(4))
        svg.append("g").attr("class", "y axis").attr("transform", `translate(${margin},${margin})`).call(d3.axisRight(y_cases).ticks(10))
        svg.append("g").attr("class", "y axis").attr("transform", `translate(${width + margin}, ${margin})`).call(d3.axisLeft(y_deaths).ticks(10))
        
        svg.append("text").attr("class", "x label").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height - 6 - margin).text("Time (years)")
        svg.append("text").attr("class", "y label").attr("text-anchor", "end").attr("x", -width / 4).attr("y", 6).attr("dy", ".75em").attr("transform", "rotate(-90)")
        .text("Number of COVID-19 Cases")
        svg.append("text").attr("class", "y label").attr("text-anchor", "end").attr("x", -width / 4).attr("y", width + 6 + margin).attr("dy", ".75em").attr("transform", "rotate(-90)")
        .text("Numeber of Deaths")

        const endDate = d3.max(state_data, d => d.date)
        const endCases = d3.max(state_data, d => d.cases)
        const endDeaths = d3.max(state_data, d => d.deaths)

        svg.append("circle").attr("class", "endpoint").attr("cx", x_both(endDate)).attr("cy", y_cases(endCases)).attr("r", 5).attr("transform", `translate(${margin},${margin})`)
        svg.append("text").attr("class", "annotation").attr("x", x_both(endDate) - 10).attr("y", y_cases(endCases) + margin).attr("text-anchor", "end")
        .text(`Cases: ${endCases.toLocaleString()}, Deaths: ${endDeaths.toLocaleString()}`)
    }

    sceneThree_helper(states[0])

    d3.select("#stateSelect").on("change", function() {
        sceneThree_helper(this.value)
    })
}

async function sceneMap() {
    //US Map
    const _data = await TotalSortedData()
    const sortedData = _data.sort((a, b) => b.cases - a.cases)

    const bucketSize = Math.ceil(sortedData.length / 5)
    const buckets = []
    for (let i = 0; i < sortedData.length; i += bucketSize) {
        buckets.push(sortedData.slice(i, i + bucketSize))
    }

    const width = 975
    const height = 610
    
    const scene = d3.select("#scene2").select('div')
    const svg = scene.append('svg').attr("width", width).attr("height", height)
    const g = svg.append('g')
    const path = d3.geoPath()
    

    const color = d3.scaleQuantile().domain([0, 5]).range(["#ff0000", "#ff3333", "#ff6666", "#ff9999", "#ffcccc"])
    const colors = new Map()
    buckets.forEach((bucket, i) => {
        bucket.forEach(item => {
            colors.set(item.state, color(i))
        })
    })

    const legendData = [
        { range: "2,459,152+", color: "#ff0000" },
        { range: "1,648,385  - 2,451,062", color: "#ff3333" },
        { range: "892,814 - 1,580,709", color: "#ff6666" },
        { range: "288,106  - 673,541", color: "#ff9999" },
        { range: "Less than 280,525", color: "#ffcccc" }
    ]

    legendData.forEach(d => {
        const legendItem = scene.append("div")
            .attr("class", "legend-item")

        legendItem.append("div")
            .attr("class", "legend-color")
            .style("background-color", d.color)

        legendItem.append("span")
            .text(d.range)
    })

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("visibility", "hidden")

    d3.json("https://d3js.org/us-10m.v2.json").then(data => {
        const states = topojson.feature(data, data.objects.states)
        g.selectAll("path").data(states.features).enter().append("path").attr("class", "state").attr("d", path).style("fill", d => colors.get(d.properties.name))
            .on("mouseover", function(event, d) {
                d3.select(this).style("fill", "black")
                tooltip.style("visibility", "visible").text(d.properties.name + ': ' + _data.find((state) => state.state == d.properties.name).cases.toLocaleString())
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px")
            })
            .on("mouseout", function() {
                d3.select(this).style("fill", d => colors.get(d.properties.name))
                tooltip.style("visibility", "hidden")
            })
    })
}

sceneBarCharts()
sceneLineGraphs()
sceneMap()

function showScene(num) {
    d3.selectAll('.chart-container').style('display', 'none')
    d3.select(`#scene${num}`).style('display', 'block')
}