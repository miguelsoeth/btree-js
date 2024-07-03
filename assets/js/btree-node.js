// constructor
// don't call this directly, call BTree::createNode instead
var BTreeNode = function(tree, keys, children, parent){
  var newNode = Object.create(BTreeNode.prototype);
  newNode.tree = tree;
  newNode.keys = keys || [];
  newNode.children = children || []; // apparently fixed arrays are bad in JS
  newNode.parent = parent || null;

  return newNode;
}

// Traverse tree until we find correct node to insert this value
// strict=true searches for node containing exact value
BTreeNode.prototype.traverse = function(value, strict) {
  if (this.keys.indexOf(value) > -1) return this;
  else if (this.isLeaf()) {
    if (strict) return false;
    else return this;
  }
  else { // find the correct downward path for this value
    for(var i = 0; i < this.keys.length; i++){
      if(value < this.keys[i]){
        return this.children[i].traverse(value, strict);
      }
    }
    return this.children[this.keys.length].traverse(value, strict);
  }
}

BTreeNode.prototype.insert = function(value){

  var int = parseInt(value);

  if ( typeof value !== "number" || int > 1000000000000 ) {
    alert('Please enter a valid integer.');
    return false;
  }

  // insert element
  this.keys.push(value);
  this.keys.sort(function(a,b){ // sort numbers ascending
    if(a > b) return 1;
    else if(a < b) return -1;
    else return 0;
  })

  // if overflow, handle overflow (go up)
  if(this.keys.length === this.tree.order) {
    this.handleOverflow();
  } else { // if not filled, start attaching children
    this.attachChildren();
  }
}

BTreeNode.prototype.handleOverflow = function() {
  tree = this.tree;

  // find this node's median and split into 2 new nodes
  median = this.splitMedian();

  // if no parent, create an empty one and set to root
  if(this.isRoot()) {
    tree.root = tree.createNode();
    this.setParent(tree.root);
  }

  // if node is internal, unattach children and add to unattached_nodes
  if (this.isInternal()) this.unattachAllChildren();

  // remove self from parent
  target = this.parent;
  this.unsetParent();

  // Push median up to target, increment offset
  tree.current_leaf_offset += 1;
  target.insert(median);
}

// function to go down and reattach nodes
BTreeNode.prototype.attachChildren = function() {
  var target = this;
  var offset = target.tree.current_leaf_offset-1;

  // get all nodes below the current node
  var target_nodes = target.tree.unattached_nodes[offset];

  if (target_nodes && target_nodes.length > 0) {
    // first, put all existing nodes into target_nodes so they're ordered correctly
    target.unattachAllChildren();

    // then, attach keys.length+1 children to this node
    for(var i=0; i<=target.keys.length; i++) {
      target.setChild(target_nodes[0]);
      target.tree.removeUnattached(target_nodes[0], offset);
    }

    // lower offset, and repeat for each one of the children
    tree.current_leaf_offset -= 1;
    target.children.forEach(function(child) {
      child.attachChildren();
    });

    // come back up so upper levels can process appropriately
    tree.current_leaf_offset +=1;
  }
}

// helper function to split node into 2 and return the median
BTreeNode.prototype.splitMedian = function() {
  var median_index = parseInt(tree.order/2);
  var median = this.keys[median_index];

  var leftKeys = this.keys.slice(0,median_index);
  var leftNode = tree.createNode(leftKeys); // no children or parent
  tree.addUnattached(leftNode, tree.current_leaf_offset);

  var rightKeys = this.keys.slice(median_index+1, this.keys.length);
  var rightNode = tree.createNode(rightKeys);
  tree.addUnattached(rightNode, tree.current_leaf_offset);
  return median;
}


BTreeNode.prototype.setChild = function(node) {
  if (node) {
    this.children.push(node) ;
    node.parent = this;
  }
}
BTreeNode.prototype.unattachAllChildren = function() {
  var length = this.children.length;
  for(var i=0; i<length; i++) {
    child = this.children[0];
    child.unsetParent();
    tree.addUnattached(child, tree.current_leaf_offset-1);
  }
}

BTreeNode.prototype.setParent = function(node) {
  node.setChild(this);
}

BTreeNode.prototype.unsetParent = function() {
  var node = this;
  if (node.parent) {
    node.parent.children.forEach(function(child, index){
      if (child === node) node.parent.children.splice(index, 1);
    });
    node.parent = null;
  }
}

BTreeNode.prototype.isRoot = function() {
  return this.parent === null;
}
BTreeNode.prototype.isLeaf = function() {
  return (!this.children) || this.children.length === 0;
}
BTreeNode.prototype.isInternal = function() {
  return !this.isLeaf() && !this.isRoot();
}

// generate node json, used in BTree::toJSON
BTreeNode.prototype.toJSON = function() {
    var json = {};
    json.name = this.keys.toString();
    if (!this.isRoot()) json.parent = this.parent.keys.toString();
    if (!this.isLeaf()) {
      json.children = [];
      this.children.forEach(function(child, index){
        json.children.push(child.toJSON());
      });
    }
    return json;
}


//Delete functions
BTreeNode.prototype.delete = function(value) {
  var nodeToDelete = this.traverse(value, true);
  if (!nodeToDelete) return false; // Value not found

  var index = nodeToDelete.keys.indexOf(value);
  if (index === -1) return false; // Value not found in keys

  // If the node is a leaf, simply remove the key
  if (nodeToDelete.isLeaf()) {
    nodeToDelete.keys.splice(index, 1);
  } else {
    // If the node is an internal node, replace the key with the predecessor or successor
    var predecessorNode = nodeToDelete.children[index];
    while (!predecessorNode.isLeaf()) {
      predecessorNode = predecessorNode.children[predecessorNode.children.length - 1];
    }
    var predecessorKey = predecessorNode.keys.pop();
    nodeToDelete.keys[index] = predecessorKey;

    // Handle underflow in the predecessor node
    if (predecessorNode.keys.length < Math.ceil(this.tree.order / 2) - 1) {
      this.handleUnderflow(predecessorNode);
    }
  }

  // Handle underflow if necessary
  if (nodeToDelete.keys.length < Math.ceil(this.tree.order / 2) - 1 && !nodeToDelete.isRoot()) {
    this.handleUnderflow(nodeToDelete);
  }

  return true; // Successfully deleted
}

BTreeNode.prototype.handleUnderflow = function(node) {
  var parent = node.parent;

  var siblingIndex = parent.children.indexOf(node);
  var leftSibling = siblingIndex > 0 ? parent.children[siblingIndex - 1] : null;
  var rightSibling = siblingIndex < parent.children.length - 1 ? parent.children[siblingIndex + 1] : null;

  if (leftSibling && leftSibling.keys.length > Math.ceil(this.tree.order / 2) - 1) {
    this.borrowFromLeftSibling(parent, siblingIndex);
  } else if (rightSibling && rightSibling.keys.length > Math.ceil(this.tree.order / 2) - 1) {
    this.borrowFromRightSibling(parent, siblingIndex);
  } else if (leftSibling) {
    this.mergeWithLeftSibling(parent, siblingIndex);
  } else if (rightSibling) {
    this.mergeWithRightSibling(parent, siblingIndex);
  }

  if (parent.keys.length < Math.ceil(this.tree.order / 2) - 1 && !parent.isRoot()) {
    this.handleUnderflow(parent);
  }
}

BTreeNode.prototype.borrowFromLeftSibling = function(parent, siblingIndex) {
  var leftSibling = parent.children[siblingIndex - 1];
  var node = parent.children[siblingIndex];

  node.keys.unshift(parent.keys[siblingIndex - 1]);
  parent.keys[siblingIndex - 1] = leftSibling.keys.pop();

  if (!leftSibling.isLeaf()) {
    node.children.unshift(leftSibling.children.pop());
    node.children[0].parent = node;
  }
}

BTreeNode.prototype.borrowFromRightSibling = function(parent, siblingIndex) {
  var rightSibling = parent.children[siblingIndex + 1];
  var node = parent.children[siblingIndex];

  node.keys.push(parent.keys[siblingIndex]);
  parent.keys[siblingIndex] = rightSibling.keys.shift();

  if (!rightSibling.isLeaf()) {
    node.children.push(rightSibling.children.shift());
    node.children[node.children.length - 1].parent = node;
  }
}

BTreeNode.prototype.mergeWithLeftSibling = function(parent, siblingIndex) {
  var leftSibling = parent.children[siblingIndex - 1];
  var node = parent.children[siblingIndex];

  leftSibling.keys.push(parent.keys[siblingIndex - 1]);
  leftSibling.keys = leftSibling.keys.concat(node.keys);

  if (!node.isLeaf()) {
    leftSibling.children = leftSibling.children.concat(node.children);
    node.children.forEach(child => {
      child.parent = leftSibling;
    });
  }

  parent.keys.splice(siblingIndex - 1, 1);
  parent.children.splice(siblingIndex, 1);

  // If the parent is the root and now has no keys, make the leftSibling the new root
  if (parent.isRoot() && parent.keys.length === 0) {
    this.tree.root = leftSibling;
    leftSibling.parent = null;
  }
}

BTreeNode.prototype.mergeWithRightSibling = function(parent, siblingIndex) {
  var rightSibling = parent.children[siblingIndex + 1];
  var node = parent.children[siblingIndex];

  node.keys.push(parent.keys[siblingIndex]);
  node.keys = node.keys.concat(rightSibling.keys);

  if (!rightSibling.isLeaf()) {
    node.children = node.children.concat(rightSibling.children);
    rightSibling.children.forEach(child => {
      child.parent = node;
    });
  }

  parent.keys.splice(siblingIndex, 1);
  parent.children.splice(siblingIndex + 1, 1);

  // If the parent is the root and now has no keys, make the node the new root
  if (parent.isRoot() && parent.keys.length === 0) {
    this.tree.root = node;
    node.parent = null;
  }
}
