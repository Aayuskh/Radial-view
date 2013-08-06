
//0, 1, 2, 3 are the importance of nodes, node sizes are in third zoom level
var nodesRadius = {};
nodesRadius[0] = 117;
nodesRadius[1] = 75;
nodesRadius[2] = 55;
nodesRadius[3] = 36.5;

//maxNum is the max number of nodes with all largest radius, this is used for calculating the treeDiameter
var maxNum = 10;

var treeDiameter;
var margin = 100;
var nodes, links, nodesByLevel, dataNodes;

var svg;
var svgSide;

var tree;
var treeDepth;

//merged node count in the first level
var firstLevelMergeCount = 0;

//last node index for the first level
var lastNodeIdx;

//adjust step when overlap happens, result will be much more precise if the value is smaller
var nodeAdjustStep = 1;



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
    });

  svgSide = treeDiameter + nodesRadius[0] + margin;
  nodes = tree.nodes(root);
  links = tree.links(nodes);
  lastNodeIdx = nodes[0].children.length-1;
  getNodesLevel();
  adjustOverlap();
  nodeMerge();
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
  var newIdx;
  if(node.depth == 0)
    newIdx = ++lastNodeIdx;
  else
    newIdx = node.children.length;
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
    newNode.depth = node.depth + 1;
    node.children.push(newNode);
    nodes = tree.nodes(nodes[0]);
    links = tree.links(nodes);
    adjustOverlap();
    nodeMerge();
    redraw();
}

//draw the radial tree when the page is load (all nodes have already been put to proper positions so that there is no overlap)
function draw() {
  svg = d3.select("body").append("svg")
              .attr("width", svgSide)
              .attr("height", svgSide)
              .append("g")
              .attr("transform", "translate(" + svgSide/2 + "," + svgSide/2 + ")");
              

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
        if(d.merged == null)
          add(d);
      });

  node.append("circle")
      .attr("r", function(d) {
        return nodesRadius[d.importance];
      });

  node.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return "rotate(" + (90 - d.x) + ")"; })
      .attr("style", "font-size:large")
      .text(function(d) { 
        if(d.merged != null) {
          if(d.id == "level_1_merge")
            return firstLevelMergeCount;
          else
            return "self merged";
        }
        else
          return null;
      });

  document.getElementById('cell').focus();
}

//draw straight lines instead of curves for the most inner radial level
//note: for the outer radial, I use curve since it can overcome the 180 degree problem, see the pictures named 120.png or 200.png
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
        if(d.merged == null)
          add(d);
      });


  node.append("circle")
      .attr("r", function(d) {
        return nodesRadius[d.importance];
      });

  node.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return "rotate(" + (90 - d.x) + ")"; })
      .attr("style", "font-size:large")
      .text(function(d) { 
        if(d.merged != null) {
          if(d.id == "level_1_merge")
            return firstLevelMergeCount;
          else
            return "self merged";
        }
        else
          return null;
      });
          
}

//convert the original nested tree to an array, used for calculated the tree level count so that then can calculate canvas size
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

//get nodes by level
function getNodesLevel() {
  nodesByLevel = new Array();
  for(var i = 0; i < nodes.length; ++i) {
    if(nodesByLevel[nodes[i].depth] == null)
      nodesByLevel[nodes[i].depth] = new Array();
    nodesByLevel[nodes[i].depth].push(nodes[i]);
  }
}

//adjust overlap level by level
function adjustOverlap() {
  getNodesLevel();
  for(var i = 1; i < nodesByLevel.length; ++i) {
    var levelNodes = nodesByLevel[i];
    var last = levelNodes.length-1;
    var angle = (levelNodes[last].x - levelNodes[0].x) * Math.PI / 180;
    if(angle > Math.PI)
      angle = Math.PI * 2 - angle;

    var dist = 2 * levelNodes[0].y * Math.sin(angle / 2);
    while(dist < nodesRadius[levelNodes[0].importance] + nodesRadius[levelNodes[last].importance] + 2) {
      for(var j = 0; j < last; ++j)
        changeDist(i, j);
      getNodesLevel();
      levelNodes = nodesByLevel[i];
        var angle = (levelNodes[last].x - levelNodes[0].x) * Math.PI / 180;
        if(angle > Math.PI)
          angle = Math.PI * 2 - angle;
      dist = 2 * levelNodes[0].y * Math.sin(angle / 2);
    }
  }

}

//if overlap happens, slightly change distance between nodes
function changeDist(level, index) {
  nodesByLevel[level][index].x += nodeAdjustStep;
  for(var i = 0; i < nodes.length; ++i) {
    if(nodes[i].id == nodesByLevel[level][index]) {
      nodes[i].x += nodeAdjustStep;
      break;
    }
  }
}

//node merge if overlap still happens after adjusting, level 1 will be merged in different way from other levels
function nodeMerge() {
  getNodesLevel();
  for(var i = 1; i < nodesByLevel.length; ++i) {
    var levelNodes = nodesByLevel[i];
    var last = levelNodes.length-1;
    var angle = (levelNodes[last].x - levelNodes[last-1].x) * Math.PI / 180;
    if(angle > Math.PI)
      angle = Math.PI * 2 - angle;
    var dist = 2 * levelNodes[last].y * Math.sin(angle / 2);
    if(dist < nodesRadius[levelNodes[last-1].importance] + nodesRadius[levelNodes[last].importance] + 2) {
      if(i == 1) {
        var minImpNode = getMinImpNode(i);
        if(firstLevelMergeCount >= 1) {
          mergeFirstLevel(minImpNode);
        }
        else {
          var sndMinImpNode = getSndMinImpNode(i, minImpNode);
          mergeFirstLevel(minImpNode, sndMinImpNode);
        }
        
        nodes = tree.nodes(nodes[0]);
        links = tree.links(nodes);
        adjustOverlap();
        nodeMerge();
        redraw();
      }
      else {
        var minImpNode = getMinImpNodeLargerThanTwo(i-1);
        mergeOtherLevels(i-1, minImpNode);
        links = tree.links(nodes);
        adjustOverlap();
        nodeMerge();
        redraw();
      }
    }
  }
}

//get minimum importance node in a certain level
function getMinImpNode(level) {
  var minImp = getNodeImportance(nodesByLevel[level][0]);
  var minImpNode;
  for(var i = 1; i < nodesByLevel[level].length; ++i) {
    if(minImp > getNodeImportance(nodesByLevel[level][i]) && nodesByLevel[level][i].id != "level_1_merge") {
      minImp = getNodeImportance(nodesByLevel[level][i]);
      minImpNode = nodesByLevel[level][i];
    }
  }
  return minImpNode;
}

//get minimum importance node whose importance is larger than two in a certain level
function getMinImpNodeLargerThanTwo(level) {
  var minImp;
  var minImpNode;
  for(var i = 0; i < nodesByLevel[level].length; ++i) {
    if(getNodeImportance(nodesByLevel[level][i]) > 1 && nodesByLevel[level][i].id != "level_1_merge") {
      minImp = getNodeImportance(nodesByLevel[level][i]);
      minImpNode = nodesByLevel[level][i];
    }
  }

  for(var i = 0; i < nodesByLevel[level].length; ++i) {
    if(minImp > getNodeImportance(nodesByLevel[level][i]) && getNodeImportance(nodesByLevel[level][i]) > 1 && nodesByLevel[level][i].id != "level_1_merge") {
      minImp = getNodeImportance(nodesByLevel[level][i]);
      minImpNode = nodesByLevel[level][i];
    }
  }

  return minImpNode;
}

//get second minimum importance node in a certain level
function getSndMinImpNode(level, minImpNode) {
  var sndMinImp = getNodeImportance(nodesByLevel[level][0]);
  var sndMinImpNode;
  for(var i = 1; i < nodesByLevel[level].length; ++i) {
    if(nodesByLevel[level][i].id != minImpNode.id && nodesByLevel[level][i].id != "level_1_merge") {
      if(sndMinImp > getNodeImportance(nodesByLevel[level][i])) {
        sndMinImp = getNodeImportance(nodesByLevel[level][i]);
        sndMinImpNode = nodesByLevel[level][i];
      }
    }
    
  }
  return sndMinImpNode;
}

//merge first level node if overlap happens in first level
function mergeFirstLevel(minImpNode, sndMinImpNode) {
  for(var i = 0; i < nodes[0].children.length; ++i) {
    if(nodes[0].children[i] != null && minImpNode.id == nodes[0].children[i].id) {
      removeByIndex(i);
      break;
    }
  }

  if(sndMinImpNode == null) {
    for(var i = 0; i < nodes[0].children.length; ++i) {
      if(nodes[0].children[i].id == "level_1_merge") {
        nodes[0].children[i].mergeCount = ++firstLevelMergeCount;
        nodes[0].children[i].mergedChildren.push(minImpNode);
      }
    }

  }
  else {

    for(var i = 0; i < nodes[0].children.length; ++i) {
      if(sndMinImpNode.id == nodes[0].children[i].id) {
        nodes[0].children[i].id = "level_1_merge";
        nodes[0].children[i].importance = 3;
        nodes[0].children[i].merged = true;
        delete nodes[0].children[i].children;
        firstLevelMergeCount += 2;
        nodes[0].children[i].mergeCount = firstLevelMergeCount;
        if(firstLevelMergeCount == 2)
          nodes[0].children[i].mergedChildren = new Array();
        if(minImpNode.id != "level_1_merge") 
          nodes[0].children[i].mergedChildren.push(minImpNode);
        if(sndMinImpNode.id != "level_1_merge")
          nodes[0].children[i].mergedChildren.push(sndMinImpNode);
      }
    }
  }
}

//merge other level nodes if overlap happens in other level
function mergeOtherLevels(level, minImpNode) {
  removeChildren(nodes[0], minImpNode);
  nodes = tree.nodes(nodes[0]);
  getNodesLevel();
}

//remove a certain node's children from root node
function removeChildren(root, node) {
  if(root == null)
    return;
  if(root.id == node.id) {
    root.merged = true;
    root.mergedChildren = root.children.slice(0);
    delete root.children;
  }
  else if(root.children != null) {
    for(var i = 0; i < root.children.length; ++i) {
      removeChildren(root.children[i], node);
    }
  }
}

//remove children from root node by index
function removeByIndex(index) {
  var tmp = nodes[0].children.slice(0);
  nodes[0].children = new Array();
  for(var i = 0; i < tmp.length; ++i) {
    if(i != index) 
      nodes[0].children.push(tmp[i]);
  }
}

//get node importance of a certain node
//note: node importance is decided by their children number recursively
function getNodeImportance(node) {
  var imp = 1;
  if(node.children == null) {
    return 1;
  }
  for(var i = 0; i < node.children.length; ++i) {
    imp += getNodeImportance(node.children[i]);
  }
  return imp;

}
