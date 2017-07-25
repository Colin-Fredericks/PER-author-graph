// Uses d3 version 4

function createV4SelectableForceDirectedGraph(svg, graph) {

    var width = +svg.attr('width'),
        height = +svg.attr('height');

    let parentWidth = d3.select('svg').node().parentNode.clientWidth;
    let parentHeight = d3.select('svg').node().parentNode.clientHeight;

    var svg = d3.select('svg')
    .attr('width', parentWidth)
    .attr('height', parentHeight)

    // remove any previous graphs
    svg.selectAll('.g-main').remove();

    var gMain = svg.append('g')
    .classed('g-main', true);

    var rect = gMain.append('rect')
    .attr('width', parentWidth)
    .attr('height', parentHeight)
    .style('fill', 'white')

    var gDraw = gMain.append('g');

    var zoom = d3.zoom()
    .on('zoom', zoomed);
    
    gMain.call(zoom);


    function zoomed() {
        gDraw.attr('transform', d3.event.transform);
    }

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    if (! ('links' in graph)) {
        console.log('Graph is missing links');
        return;
    }

    var nodes = {};
    var i;
    for (i = 0; i < graph.nodes.length; i++) {
        nodes[graph.nodes[i].id] = graph.nodes[i];
        graph.nodes[i].weight = 1.01;
    }

    // the brush needs to go before the nodes so that it doesn't
    // get called when the mouse is over a node
    var gBrushHolder = gDraw.append('g');
    var gBrush = null;

    var link = gDraw.append('g')
        .attr('class', 'link')
        .selectAll('line')
        .data(graph.links)
        .enter().append('line')
        .attr('stroke-width', function(d) { return Math.sqrt(d.value); });

    // Make groups to hold the node-circles and their initials.
    var nodeGroup = gDraw.append('g')
        .attr('class', 'node')
        .selectAll('circle')
        .data(graph.nodes)
        .enter()
        .append('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

    var node = nodeGroup.append('circle')
        .classed('nodes', true)
        .attr('r', function(d) { return Math.sqrt(d.publications) * 4; })
        .attr('fill', function(d) {
            if ('color' in d)
                return d.color;
            else
                return color(d.group);
        });

    var nodeText = nodeGroup.append('text')
        .text(function(d){ return d.initials; })
        .attr('font-size', function(d){
          return Math.max(Math.sqrt(d.publications) * 3.5, 10);
        })
        .attr('fill','black');

    // add titles for mouseover blurbs
    node.append('title')
        .text(function(d) {
            if ('name' in d)
                return d.name;
            else
                return d.id;
        });
    nodeText.append('title')
        .text(function(d) {
            if ('name' in d)
                return d.name;
            else
                return d.id;
        });
        
    var authorList = d3.select('#namelist');

    // Add author filter
    var authorFilter = authorList
        .append('form')
            .attr('id', 'filterForm')
        .append('input')
            .attr('type', 'text')
            .attr('name', 'authorFilter')
            .attr('value', '(enter name)')
        .on('input', function(){
            filterList(this.value);
        })
        .on('click tap', function(){
            this.select();
        });
    
    function filterList(filterText){

        // If the input is blank, show all authors and be done.
        if(filterText === ''){
            d3.selectAll('.authorname')
                .classed('hidden', false);
        }else{
            // Hide every author
            var allAuthors = d3.selectAll('.authorname')
                .classed('hidden', true);
            // Get the part of the author list whose name contains the filter text
            // Show those authors
            allAuthors.filter(function(d){
                return d.name.toLowerCase().includes(filterText.toLowerCase());
            }).classed('hidden', false);
        }

    }

    // Add author names to list
    var authors = authorList
        .selectAll('p')
        .data(graph.nodes)
        .enter().append('p')
        .classed('authorname', true)
        .text(function(d){ return d.name })
        .on('click', function(d){ updateInfo(d) });

    var simulation = d3.forceSimulation()
        .force('link', d3.forceLink()
                .id(function(d) { return d.id; })
                .strength(.7)
                .distance(function(d) {
                    return 100;
                })
        )
        .force('charge', d3.forceManyBody()
            .strength(-200)
        )
        .force('center', d3.forceCenter(parentWidth / 2, parentHeight / 2))
        .force('x', d3.forceX(parentWidth/2))
        .force('y', d3.forceY(parentHeight/2));

    simulation
        .nodes(graph.nodes)
        .on('tick', ticked);

    simulation.force('link')
        .links(graph.links);

    function ticked() {
        // update node and line positions at every step of
        // the force simulation
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });

        node.attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
        nodeText.attr('x', function(d) { return d.x; })
            .attr('y', function(d) { return d.y; });
    }

    var brushMode = false;
    var brushing = false;

    var brush = d3.brush()
        .on('start', brushstarted)
        .on('brush', brushed)
        .on('end', brushended);

    function brushstarted() {
        // keep track of whether we're actively brushing so that we
        // don't remove the brush on keyup in the middle of a selection
        brushing = true;

        nodeGroup.each(function(d) {
            d.previouslySelected = shiftKey && d.selected;
        });
    }

    rect.on('click', () => {
        
        console.log('deselected by clicking on rect');
        nodeGroup.each(function(d) {
            d.selected = false;
            d.previouslySelected = false;
        });
        nodeGroup.classed('selected', false);
        link.classed('selected', false);

    });

    function brushed() {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) return;

        var extent = d3.event.selection;
        
        var shouldSelect = d.selected = d.previouslySelected ^
            (extent[0][0] <= d.x && d.x < extent[1][0]
             && extent[0][1] <= d.y && d.y < extent[1][1]);

        nodeGroup.classed('selected', shouldSelect);
        
        if(shouldSelect){
            var authorInfo = d3.select('#moreinfo');
            console.log(authorInfo);
            authorInfo.append('p')
                .text('testing');
        }
    }

    function brushended() {
        if (!d3.event.sourceEvent) return;
        if (!d3.event.selection) return;
        if (!gBrush) return;

        gBrush.call(brush.move, null);

        if (!brushMode) {
            // the shift key has been release before we ended our brushing
            gBrush.remove();
            gBrush = null;
        }

        brushing = false;
    }

    d3.select('body').on('keydown', keydown);
    d3.select('body').on('keyup', keyup);

    var shiftKey;

    function keydown() {
        shiftKey = d3.event.shiftKey;

        if (shiftKey) {
            // if we already have a brush, don't do anything
            if (gBrush)
                return;

            brushMode = true;

            if (!gBrush) {
                gBrush = gBrushHolder.append('g');
                gBrush.call(brush);
            }
        }
    }

    function keyup() {
        shiftKey = false;
        brushMode = false;

        if (!gBrush)
            return;

        if (!brushing) {
            // only remove the brush if we're not actively brushing
            // otherwise it'll be removed when the brushing ends
            gBrush.remove();
            gBrush = null;
        }
    }
    
    function updateInfo(author){
        var authorInfo = d3.select('#moreinfo');
        
        // Clear existing author info
        authorInfo.selectAll('p').remove();
        
        // Add whatever info we have
        if('name' in author){
            authorInfo.append('p')
            .html('<strong>Author:</strong> ' + author.name);
        }
        if('publications' in author){
            authorInfo.append('p')
            .html('<strong>Publications:</strong> ' + author.publications);
        }
        
        // If they're not in the current view, scroll them into the center.
        if( !isInView(author) ){ panToNode(author); }
        
        // Deselect all the links.
        link.classed('selected', false);
        
        // Select the ones that match and set their style.
        link.filter(function(d) {
            return (d.source.id === author.id) || (d.target.id === author.id);
           })
          .classed('selected', true);
    }

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.9).restart();

        if (!d.selected && !shiftKey) {
            // if this node isn't selected, then we have to unselect every other node
            nodeGroup.classed('selected', function(p) { return p.selected =  p.previouslySelected = false; });
            console.log(d);            
        }

        d3.select(this).classed('selected', function(p) { d.previouslySelected = d.selected; return d.selected = true; });

        node.filter(function(d) { return d.selected; })
            .each(function(d) {
                d.fx = d.x;
                d.fy = d.y;
                // Update the info box for this author
                updateInfo(d);
        });

    }
    
    function panToNode(author){
        // This is a placeholder function that I will eventually expand
        // to let selecting an author make the whole graph pan to center that author.
        // I should copy some stuff from the drag functionality.
        
        var xOffset = (width / 2) - Number(author.x);
        var yOffset = (height / 2) - Number(author.y);

        console.log('pan ' + author.name + ' to center');
        console.log('offset: x=' + xOffset + ', y=' + yOffset);
        
        // Moving the nodes causes strange and inexplicable behavior.
        // I need to move the viewport.

        // I can't seem to move the author to the actual center. I have no idea why changing these numbers doesn't do much.
//         d3.selectAll('circle').attr('transform', 'translate('+(-Number(author.x)+width/2)+','+(-Number(author.y+height/2))+')');
//         d3.selectAll('line').attr('transform', 'translate('+(-Number(author.x)+width/2)+','+(-Number(author.y)+height/2)+')');
//         d3.selectAll('text').attr('transform', 'translate('+(-Number(author.x)+width/2)+','+(-Number(author.y)+height/2)+')');
        
        //Another maybe:
        simulation.force('center', d3.forceCenter(xOffset, yOffset));
        
    }
    
    function isInView(d){
        // Another placeholder function - checks to see if a particular author is 
        // inside the current view window (less than 10 pixels from the edge).
        
        return false;
        
//         if( d.x =< 10 || d.x >= width - 10 ){
//             return false;
//         }
//         if( d.y =< 10 || d.y >= height - 10 ){
//             return false;
//         }
//         return true;
        
    }

    function dragged(d) {
        node.filter(function(d) { return d.selected; })
            .each(function(d) {
            d.fx += d3.event.dx;
            d.fy += d3.event.dy;
        })
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        node.filter(function(d) { return d.selected; })
        .each(function(d) {
            d.fx = null;
            d.fy = null;
        })
    }

    return graph;
};
