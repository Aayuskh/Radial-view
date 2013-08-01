
//0, 1, 2, 3 are the importance of nodes
var nodesRadius = {};
nodesRadius[0] = 117;
nodesRadius[1] = 75;
nodesRadius[2] = 55;
nodesRadius[3] = 36.5;

//maxNum is the max number of nodes with all largest radius, this is used for calculating the treeDiameter
var maxNum = 10;

var treeDiameter;
var margin = 100;
var nodes, links;

var svg;
var svgSide;

var tree;
var treeDepth;

//use projection for map x, y coordinates to polar coordinates
var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

//get tree data from json file
d3.json("data.json", function(error, root) {
  treeDepth = getTreeDepth(flatten(root));
  treeDiameter = 2 * treeDepth * nodesRadius[0] / Math.sin(360 / maxNum * Math.PI / 180 / 2);
  tree = d3.layout.tree()
    .size([360, treeDiameter / 2])
    .separation(function(a, b) {
      return (nodesRadius[a.importance] + nodesRadius[b.importance]) / a.depth;
    })
  svgSide = treeDiameter + nodesRadius[0] + margin;
  nodes = tree.nodes(root);
  links = tree.links(nodes);
  adjustOverlap(root);
  draw();
});

//get tree depth of a given tree represented by an array of nodes
function getTreeDepth(nodes) {
  var depth = 1;
  for(var i = 0; i < nodes.length; ++i) {
    var tmpDepth = getNodeDepth(nodes[i])
    if(tmpDepth > depth)
      depth = tmpDepth;
  }
  return depth;
}

//get depth of a given node
function getNodeDepth(node) {
  var depth = 1;
  for(var i = 0; i < node.id.length; ++i) {
    if(node.id.charAt(i) == '_')
      ++depth;
  }
  return depth;
}

//add a child for a certain node when click it
function add(node) {
  if(node.children == null)
    node.children = new Array();
  var newIdx = node.children.length;
  var newNode = {};
  newNode.id = node.id + "_" + newIdx;
  newNode.depth = node.depth + 1;
  if(newNode.depth > treeDepth) {
    treeDepth = newNode.depth;
    treeDiameter = 2 * treeDepth * nodesRadius[0] / Math.sin(360 / maxNum * Math.PI / 180 / 2);
    tree = d3.layout.tree()
      .size([360, treeDiameter / 2])
      .separation(function(a, b) {
        return (nodesRadius[a.importance] + nodesRadius[b.importance]) / getNodeDepth(a);
      })
    svgSide = treeDiameter + nodesRadius[0] + margin;
    }
    newNode.importance = Math.floor(Math.random() * 4);
    newNode.content = "people post contents";
    newNode.parent = node;
    node.children.push(newNode);
    nodes = tree.nodes(nodes[0]);
    links = tree.links(nodes);
    adjustOverlap(nodes[0]);
    console.log(nodes.length);
    redraw();
}

//draw the radial tree when the page is load (all nodes have already been put to proper positions so that there is no overlap)
function draw() {
  svg = d3.select("body").append("svg")
              .attr("width", svgSide)
              .attr("height", svgSide)
              .append("g")
              .attr("transform", "translate(" + svgSide / 2 + "," + svgSide / 2 + ")")
  var link = svg.selectAll(".link")
      .data(links)
    .enter().append("path")
      .attr("class", "link")
      .attr("id", function(d) {
        return d.source.id + "_" + d.target.id;
      })
      .attr("d", diagonal);

  drawLine();

  var node = svg.selectAll(".node")
      .data(nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("id", function(d) {
        return d.id;
      })
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
      .on("click", function(d) {
        add(d);
      })

  node.append("circle")
      .attr("r", function(d) {
        return nodesRadius[d.importance];
      });

  document.getElementById('cell').focus();
}

//draw straight lines instead of curves for the most inner radial level
//Note: for the outer radial, I use curve since it can overcome the 180 degree problem, see the pictures named 120.png or 200.png
function drawLine() {
  for(var i = 0; i < links.length; ++i) {
    if(links[i].source.id != "cell")
      return;
    var id = links[i].source.id + "_" + links[i].target.id;
    svg.select("#" + id).remove();
    svg.append("line")
      .attr("class", "link")
      .attr("x1", 0)
      .attr("y2", 0)
      .attr("x2", links[i].target.y * Math.cos((links[i].target.x + 270) * Math.PI / 180))
      .attr("y2", links[i].target.y * Math.sin((links[i].target.x + 270) * Math.PI / 180));
  }
}

//redraw the radial tree if there are positions change after adding a new node
function redraw() {
  svg.selectAll(".node").remove();
  svg.selectAll(".link").remove();
  var link = svg.selectAll(".link")
    .data(links)
    .enter().append("path")
      .attr("class", "link")
      .attr("id", function(d) {
        return d.source.id + "_" + d.target.id;
      })
      .attr("d", diagonal);

  drawLine();

  var node = svg.selectAll(".node")
    .data(nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("id", function(d) {
        return d.id;
      })
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
      .on("click", function(d) {
        add(d);
      })

  node.append("circle")
      .attr("r", function(d) {
        return nodesRadius[d.importance];
      });

}

//convert the original nested tree to an array
function flatten(root) {
  var nodes = [], i = 0;

  function recurse(node) {
    if (node.children) node.size = node.children.reduce(function(p, v) { return p + recurse(v); }, 0);
    if (!node.id) node.id = ++i;
    nodes.push(node);
    return node.size;
  }

  root.size = recurse(root);
  return nodes;
}

//adjust the very small possibility of overlap of first node and last node of the first radial level
function adjustOverlap(root) {
  var firstLevelNodes = root.children;
  var last = firstLevelNodes.length-1;
  var angle = (firstLevelNodes[0].x + 270 - (firstLevelNodes[last].x - 90)) * Math.PI / 180;
  var dist = 2 * firstLevelNodes[0].y * Math.sin(angle / 2);
  while(dist < nodesRadius[firstLevelNodes[0].importance] + nodesRadius[firstLevelNodes[last].importance] + 2) {
    for(var i = 0; i < last; ++i)
      root.children[i].x += 0.1;
    firstLevelNodes = root.children;
    angle = (firstLevelNodes[0].x + 270 - (firstLevelNodes[last].x - 90)) * Math.PI / 180;
    dist = 2 * firstLevelNodes[0].y * Math.sin(angle / 2);
  }

}