
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

//minimum importance and second minimum ni current level
var minImpNode, sndMinImpNode;

//gray array
var grayNodes = new Array();


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

//delete a node that has no children
function deleteNode(node) {
  if(node.children == null) {
    for(var i = 0; i < nodes.length;++i) {
      if(nodes[i].id == node.id) {
        removeFromRoot(nodes[0], node);
        break;
      }
    }
    nodes = tree.nodes(nodes[0]);
    links = tree.links(nodes);
    adjustOverlap();
    redraw();
  }
}

//make gray for deleted node that has children
function makeGray(node) {
  var circle = d3.select("#"+node.id).select("circle");
  circle.attr("style", "fill: #fff;stroke: lightgray;stroke-width: 3px;");
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
        if(d.merged == null && d.deleted == null)
          add(d);
      })
      .on("contextmenu", function(d) {
        d.deleted = true;
        d3.event.preventDefault();
        if(d.children == null) {
          deleteNode(d);
        }
        else {
          grayNodes.push(d);
          makeGray(d);
        }
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
          return "merge: " + d.mergeCount;
        }
        else
          return getNodeImportance(d);
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
      .attr("id", id)
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
        if(d.merged == null && d.deleted == null)
          add(d);
      })
      .on("contextmenu", function(d) {
        d.deleted = true;
        d3.event.preventDefault();
        if(d.children == null)
          deleteNode(d);
        else {
          grayNodes.push(d);
          makeGray(d);
        }
      });


  node.append("circle")
      .attr("r", function(d) {
        return nodesRadius[d.importance];
      });

  for(var i = 0; i < grayNodes.length; ++i)
    makeGray(grayNodes[i]);

  node.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return "rotate(" + (90 - d.x) + ")"; })
      .attr("style", "font-size:large")
      .text(function(d) { 
        if(d.merged != null) {
          return "merge: " + d.mergeCount;
        }
        else
          return getNodeImportance(d);
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

        //if the merge level's parent level nodes all have less than one child, just merge minimum importance node in parent level
        if(i != 1 && allNodesOneChild(i-1)) {
          getMinImpNode(i);
          mergeParentLevel(minImpNode.parent);
        }
        //else merge current level
        else {
          getTwoMinImpNodesWithSameParent(i);
          mergeCurrentLevel(minImpNode.parent);

        }
        //update the merged node in root node so that tree.nodes(root) can then update the entire tree
        update(nodes[0], minImpNode.parent);
        nodes = tree.nodes(nodes[0]);
        links = tree.links(nodes);
        adjustOverlap();
        nodeMerge();
        redraw();
      }
  }
}

//judge if all nodes in a certain level have only one child or no child
function allNodesOneChild(level) {
  var res = true;
  for(var i = 0; i < nodesByLevel[level].length; ++i) {
    if(nodesByLevel[level][i].children != null && nodesByLevel[level][i].children.length > 1) {
      res = false;
      break;
    }
  }
  return res;
}

//get minimum importance node in a certain level (if node is specified, for the node)
function getMinImpNode(level) {

  var minImp = getNodeImportance(nodesByLevel[level][0]);
  for(var i = 1; i < nodesByLevel[level].length; ++i) {
    if(minImp > getNodeImportance(nodesByLevel[level][i]) && nodesByLevel[level][i].merged == null) {
      minImp = getNodeImportance(nodesByLevel[level][i]);
      minImpNode = nodesByLevel[level][i];
    }
  }
}

//self-merge the less importance node whoes parent level has all one-child nodes
function mergeParentLevel(minImpNode) {
  removeChildren(nodes[0], minImpNode);
  nodes = tree.nodes(nodes[0]);
}


//get two minimum importance nodes with same parent in a certain level
function getTwoMinImpNodesWithSameParent(level) {
  var minTmp, sndTmp;
  var minNodeTmp, sndMinNodeTmp;
  var startIdx;
  for(var i = 0; i < nodesByLevel[level-1].length; ++i) {
    if((nodesByLevel[level-1][i].children.length >= 2 && nodesByLevel[level-1][i].firstMerge == null) || (nodesByLevel[level-1][i].children.length >= 3 && nodesByLevel[level-1][i].firstMerge != null)) {
      getTwoMinImpNodes(nodesByLevel[level-1][i]);
      minNodeTmp = minImpNode;
      sndMinNodeTmp = sndMinImpNode;
      minTmp = getNodeImportance(minImpNode);
      sndTmp = getNodeImportance(sndMinImpNode);
      startIdx = i+1;
      break;
    }
  }
  

  for(var i = startIdx; i < nodesByLevel[level-1].length; ++i) {
    if(nodesByLevel[level-1][i].children == null || nodesByLevel[level-1][i].children.length < 2)
      continue;
    getTwoMinImpNodes(nodesByLevel[level-1][i]);
    if((getNodeImportance(minImpNode) + getNodeImportance(sndMinImpNode)) < (minTmp + sndTmp)) {
      minNodeTmp = minImpNode;
      sndMinNodeTmp = sndMinImpNode;
      minTmp = getNodeImportance(minImpNode);
      sndTmp = getNodeImportance(sndMinImpNode);
      
    }
  }

  minImpNode = minNodeTmp;
  sndMinImpNode = sndMinNodeTmp;
}

//get two minimum importance children for a certain node
function getTwoMinImpNodes(node) {
  getMinImpNodeByParent(node);
  getSndMinImpNodeByParent(node);
}

//get minimum importance child for a certain node
function getMinImpNodeByParent(node) {
  if(node.children == null)
    return;
  if((node.children.length == 1 && node.firstMerge == null) || (node.children.length == 2 && node.firstMerge != null)) {
    minImpNode = node.children[0];
    return;
  }


  minImpNode = node.children[0].merged == null ? node.children[0] : node.children[1];
  var minImp = getNodeImportance(minImpNode);
  for(var i = 0; i < node.children.length; ++i) {
    if(minImp > getNodeImportance(node.children[i]) && node.children[i].merged == null) {
      minImp = getNodeImportance(node.children[i]);
      minImpNode = node.children[i];
    }
  }
}

//get second minimum importance child for a certain node
function getSndMinImpNodeByParent(node) {

  if(node.children == null || (node.children.length == 1 && node.firstMerge != null))
    return;
  if((node.children.length == 1 && node.firstMerge == null) || (node.children.length == 2 && node.firstMerge != null)) {
    sndMinImpNode = null;
    return;
  }

  sndMinImpNode = (minImpNode.id == node.children[0].id ? node.children[1] : node.children[0]);
  if(sndMinImpNode.merged != null)
    sndMinImpNode = node.children[2];
  var sndMinImp = getNodeImportance(sndMinImpNode);

  for(var i = 1; i < node.children.length; ++i) {
    if(node.children[i].id != minImpNode.id && sndMinImp > getNodeImportance(node.children[i]) && node.children[i].merged == null) {
      sndMinImp = getNodeImportance(node.children[i]);
      sndMinImpNode = node.children[i];
    }
  }

}

//merge current level node if overlap happens in this level
function mergeCurrentLevel(parentNode) {

  if(parentNode.isFirstMerge != null) {
    merge(parentNode);
  }
  else {
    firstMerge(parentNode);
  }
}

//remove child node in parentNode by index
function removeByIndex(parentNode, index) {
  var tmp = parentNode.children.slice(0);
  parentNode.children = new Array();
  for(var i = 0; i < tmp.length; ++i) {
    if(i != index) 
      parentNode.children.push(tmp[i]);
  }
}

//merge certain parentNode after the first time
function merge(parentNode) {
  var mergeId = parentNode.id + "_merge";
  var tmpIdx;
  for(var i = 0; i < parentNode.children.length; ++i) {
    if(parentNode.children[i].id == mergeId) {
      ++parentNode.children[i].mergeCount;
      parentNode.children[i].mergedChildren.push(minImpNode);
    }
    if(parentNode.children[i].id == minImpNode.id)
      tmpIdx = i;
  }

  removeByIndex(parentNode, tmpIdx);
}

//merge certain parentNode if this is the first time this node get merged
function firstMerge(parentNode) {
  var tmpIdx;
  for(var i = 0; i < parentNode.children.length; ++i) {
    if(parentNode.children[i].id == minImpNode.id) {
      tmpIdx = i;
    }
    if(parentNode.children[i].id == sndMinImpNode.id) {
      if(parentNode.children[i].mergeCount == null)
        parentNode.children[i].mergeCount = 0;
      parentNode.children[i].mergeCount += 2;
      if(parentNode.children[i].mergedChildren == null)
        parentNode.children[i].mergedChildren = new Array();
      parentNode.children[i].mergedChildren.push(minImpNode);
      parentNode.children[i].mergedChildren.push(sndMinImpNode);
      delete parentNode.children[i].children;
      parentNode.children[i].id = parentNode.id + "_merge";
      parentNode.children[i].importance = 3;
      parentNode.children[i].merged = true;
      parentNode.children[i].parent = parentNode;
      parentNode.children[i].depth = parentNode.depth + 1;
    }
  }

  removeByIndex(parentNode,tmpIdx);
  parentNode.isFirstMerge = false;
} 

//update node in root so that we can use tree.nodes(root) to update entire tree
function update(root, node) {
  if(root.id == node.id) {
    root = node;
    return;
  }
  else if(root.children != null) {
    for(var i = 0; i < root.children.length; ++i) {
      update(root.children[i], node);
    }
  }
}

//get node importance of a certain node
//note: node importance is decided by their children importance recursively
function getNodeImportance(node) {
  if(node == null)
    return 0;
  var imp = 4-node.importance;
  if(node.children == null) {
    return imp;
  }
  for(var i = 0; i < node.children.length; ++i) {
    imp += getNodeImportance(node.children[i]);
  }
  return imp;

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

//delete a node from root node
function removeFromRoot(root, node) {
  if(root == null)
    return;
  if(root.id == node.parent.id) {
    for(var i = 0; i < node.parent.children.length; ++i) {
      if(node.parent.children[i].id == node.id) {
        removeByIndex(root, i)
        if(root.children.length == 0)
          delete root.children;
        break;
        
      }
    }
  }
  else if(root.children != null) {
    for(var i = 0; i < root.children.length; ++i)
      removeFromRoot(root.children[i], node);
  }
}
