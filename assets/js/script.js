$(function () {
  // get tree size
  var bodyRect = d3.select("body").node().getBoundingClientRect();
  var margin = { top: 40, right: 120, bottom: 20, left: 120 }

  var width = bodyRect.width - margin.right - margin.left - 17
  var height = bodyRect.height - margin.top - margin.bottom

  // create the tree
  var tree = d3.layout.tree().size([width, height]);

  var svg = d3
    .select("#canvas")
    .append("svg")
    .attr({
      width: width + margin.right + margin.left,
      height: height + margin.top + margin.bottom,
    })
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var bTree, treeData;

  // automatically create btree with default settings
  bTree = BTree(5);
  $("#order-display").html(5);

  // add integer event handler
  $("#add-form").submit(function (event) {
    event.preventDefault();
    var value = parseInt($("#input-add").val());
    if (!value || value <= 0) {
      alert("Entrada inválida!");
      return;
    }

    bTree.insert(value, false); // silently insert

    $("#input-add").val("");
    $(".seed-btree").prop("disabled", true);
    $(".seed-btree-input").prop("disabled", true);

    treeData = bTree.toJSON();
    update(treeData);

    // Make the current add node highlighted in red
    $("g text").each(function (index) {
      var bTreeNode = bTree.search(value);
      var d3NodeTouched = d3.selectAll("g.node").filter(function (d) {
        return d.name === bTreeNode.keys.toString();
      });

      // reset all links and nodes
      d3.selectAll("g.node")
        .select("circle")
        .style({ stroke: "#ccc", fill: "#ffffff" });
      d3.selectAll(".link").style("stroke", "#ccc");

      // color links and all intermediate nodes
      colorPath(bTreeNode);

      // color bottom node
      d3NodeTouched
        .select("circle")
        .style({ stroke: "green", fill: "lightgreen" });
    });
  });

  // seed tree event handler
  $(".seed-btree").click(function (e) {
    e.preventDefault();
    var quantity = parseInt($("#quantity").val());
    if (!quantity || quantity <= 0) {
      alert("Entrada inválida!");
      return;
    }
    bTree.seed(quantity);
    var treeData = bTree.toJSON();
    update(treeData);
    $(".seed-btree").prop("disabled", true);
    $(".seed-btree-input").prop("disabled", true);
  });

  // reset tree event handler
  $(".reset-btree").click(function (e) {
    e.preventDefault();
    var order = parseInt($("#new-order").val());
    if (!order || order < 3) {
      alert("Entrada inválida!");
      return;
    }

    $("#input-add").val("");
    $("svg g").children().remove();
    $("#order-display").html(order);
    $(".seed-btree").prop("disabled", false);
    $(".seed-btree-input").prop("disabled", false);
    $(".reset-btree-input").val("");
    bTree = BTree(order);
  });

  // delete item from tree event handler
  $(".delete-btree").click(function (e) {
    e.preventDefault();
    var num = parseInt($("#input-add").val());
    if (!num || num <= 0) {
      alert("Entrada inválida!");
      return;
    }

    bTree.delete(num);

    $("#input-add").val("");
    $("svg g").children().remove();
    treeData = bTree.toJSON();
    update(treeData);
  });

  // search item from tree event handler
  $(".search-btree").click(function (e) {
    e.preventDefault();
    var num = parseInt($("#input-add").val());
    if (!num || num <= 0) {
      alert("Entrada inválida!");
      return;
    }
    $("#input-add").val("");
  
    var bTreeNode = bTree.search(num, true);
    if (!bTreeNode) {
      alert("Não encontrado!");
      return;
    }
  
    // Make the current add node highlighted in red
    $("g text").each(function (index) {
      var d3NodeTouched = d3.selectAll("g.node").filter(function (d) {
        return d.name === bTreeNode.keys.toString();
      });
  
      // Reset all links and nodes
      d3.selectAll("g.node")
        .select("circle")
        .style("stroke", "#ccc")
        .style("fill", "#ffffff");
      d3.selectAll(".link").style("stroke", "#ccc");
  
      // Color links and all intermediate nodes
      colorPath(bTreeNode);
  
      // Color bottom node
      d3NodeTouched
        .select("circle")
        .style("stroke", "green")
        .style("fill", "lightgreen");
    });
  });

  // color paths down to newly added node
  function colorPath(node) {
    // color the node itself
    d3.selectAll("g.node")
      .filter(function (d) {
        return d.name === node.keys.toString();
      })
      .select("circle")
      .style("stroke", "green");

    if (node.isRoot()) return;
    else {
      // filter for links that connect with this node
      d3.selectAll(".link")
        .filter(function (d) {
          return d.target.name === node.keys.toString();
        })
        .style("stroke", "darkgreen");
      return colorPath(node.parent);
    }
  }

  // update d3 visualization
  function update(source) {
    // Make source data into d3-usable format
    var nodes = tree.nodes(source);
    var links = tree.links(nodes);
    // console.log(links);
    // links[0].source.x -= 50;
    // console.log(links[0]);

    // Normalize for fixed-depth.
    nodes.forEach(function (d) {
      d.y = d.depth * 100;
    });

    // NODE SELECTION
    var i = 0;
    var node = svg.selectAll("g.node").data(nodes, function (d) {
      return d.id || (d.id = ++i);
    });

    // NODE D3 APPENDING
    var nodeEnter = node
      .enter()
      .append("g")
      .attr({
        class: "node",
        id: function (d) {
          return "i" + d.id;
        },
      })
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

    nodeEnter
      .append("circle")
      .attr("r", 10)
      .style("fill", "#fff")
      .style("opacity", 0)
      .transition()
      .style("opacity", 1)
      .duration(250);
    
    nodeEnter
      .append("text")
      .attr("y", function (d) {
        return d.children || d._children ? -18 : 18;
      })
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d.name;
      })
      .style("opacity", 0)
      .transition()
      .style("opacity", 1)
      .duration(250);

    // UPDATE NODE DATA + POSITION
    node.each(function (d, i) {
      var thisNode = d3.select("#" + this.id + " text");
      thisNode.text(d.name);
      d3.select("#" + this.id)
        .transition()
        .attr("transform", "translate(" + d.x + "," + d.y + ")");

      thisNode.attr("y", d.children || d._children ? -18 : 18);
    });
    // D3 LINKS
    var link = svg.selectAll("path.link").data(links, function (d) {
      return d.target.id;
    });

    var diagonal = d3.svg.diagonal().projection(function (d) {
      return [d.x, d.y];
    });
    link.enter().insert("path", "g").attr("class", "link").attr("d", diagonal);

    link.each(function (d, i) {
      var thisLink = d3.select(svg.selectAll("path.link")[0][i]);
      diagonal = d3.svg.diagonal().projection(function (d) {
        return [d.x, d.y];
      });
      thisLink.transition().attr("d", diagonal);
    });
  }
});
