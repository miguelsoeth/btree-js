// Construtor do nó BTree
// Não chame isto diretamente, use BTree::createNode
var BTreeNode = function(tree, keys, children, parent){
  var newNode = Object.create(BTreeNode.prototype);
  newNode.tree = tree; // Referência para a árvore à qual este nó pertence
  newNode.keys = keys || []; // Chaves do nó
  newNode.children = children || []; // Filhos do nó (arrays fixas são ruins em JS)
  newNode.parent = parent || null; // Pai do nó

  return newNode;
}

// Percorre a árvore até encontrar o nó correto para inserir este valor
// strict=true procura o nó contendo o valor exato
BTreeNode.prototype.traverse = function(value, strict) {
  if (this.keys.indexOf(value) > -1) return this;
  else if (this.isLeaf()) {
    if (strict) return false;
    else return this;
  }
  else { // Encontra o caminho descendente correto para este valor
    for (var i = 0; i < this.keys.length; i++){
      if (value < this.keys[i]){
        return this.children[i].traverse(value, strict);
      }
    }
    return this.children[this.keys.length].traverse(value, strict);
  }
}

BTreeNode.prototype.insert = function(value){

  var int = parseInt(value);

  if (typeof value !== "number" || int > 1000000000000) {
    alert('Por favor, insira um número inteiro válido.');
    return false;
  }

  // Insere o elemento
  this.keys.push(value);
  this.keys.sort(function(a, b){ // Ordena os números em ordem crescente
    if (a > b) return 1;
    else if (a < b) return -1;
    else return 0;
  });

  // Se houver overflow, trata o overflow (sobe)
  if (this.keys.length === this.tree.order) {
    this.handleOverflow();
  } else { // Se não estiver cheio, começa a anexar os filhos
    this.attachChildren();
  }
}

BTreeNode.prototype.handleOverflow = function() {
  tree = this.tree;

  // Encontra o mediano deste nó e divide em 2 novos nós
  median = this.splitMedian();

  // Se não houver pai, cria um vazio e define como raiz
  if (this.isRoot()) {
    tree.root = tree.createNode();
    this.setParent(tree.root);
  }

  // Se o nó é interno, desanexa filhos e adiciona a unattached_nodes
  if (this.isInternal()) this.unattachAllChildren();

  // Remove-se do pai
  target = this.parent;
  this.unsetParent();

  // Empurra o mediano para cima, incrementa offset
  tree.current_leaf_offset += 1;
  target.insert(median);
}

// Função para descer e reanexar nós
BTreeNode.prototype.attachChildren = function() {
  var target = this;
  var offset = target.tree.current_leaf_offset - 1;

  // Obtém todos os nós abaixo do nó atual
  var target_nodes = target.tree.unattached_nodes[offset];

  if (target_nodes && target_nodes.length > 0) {
    // Primeiro, coloca todos os nós existentes em target_nodes para que fiquem ordenados corretamente
    target.unattachAllChildren();

    // Em seguida, anexa keys.length+1 filhos a este nó
    for (var i = 0; i <= target.keys.length; i++) {
      target.setChild(target_nodes[0]);
      target.tree.removeUnattached(target_nodes[0], offset);
    }

    // Reduz o offset e repete para cada um dos filhos
    tree.current_leaf_offset -= 1;
    target.children.forEach(function(child) {
      child.attachChildren();
    });

    // Volta para cima para que os níveis superiores possam processar apropriadamente
    tree.current_leaf_offset += 1;
  }
}

// Função auxiliar para dividir o nó em 2 e retornar o mediano
BTreeNode.prototype.splitMedian = function() {
  var median_index = parseInt(tree.order / 2);
  var median = this.keys[median_index];

  var leftKeys = this.keys.slice(0, median_index);
  var leftNode = tree.createNode(leftKeys); // Sem filhos ou pai
  tree.addUnattached(leftNode, tree.current_leaf_offset);

  var rightKeys = this.keys.slice(median_index + 1, this.keys.length);
  var rightNode = tree.createNode(rightKeys);
  tree.addUnattached(rightNode, tree.current_leaf_offset);
  return median;
}

BTreeNode.prototype.setChild = function(node) {
  if (node) {
    this.children.push(node);
    node.parent = this;
  }
}

BTreeNode.prototype.unattachAllChildren = function() {
  var length = this.children.length;
  for (var i = 0; i < length; i++) {
    child = this.children[0];
    child.unsetParent();
    tree.addUnattached(child, tree.current_leaf_offset - 1);
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

// Gera JSON do nó, usado em BTree::toJSON
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

// Funções de deleção
BTreeNode.prototype.delete = function(value) {
  var nodeToDelete = this.traverse(value, true);
  if (!nodeToDelete) return false; // Valor não encontrado

  var index = nodeToDelete.keys.indexOf(value);
  if (index === -1) return false; // Valor não encontrado nas chaves

  // Se o nó é uma folha, simplesmente remove a chave
  if (nodeToDelete.isLeaf()) {
    nodeToDelete.keys.splice(index, 1);
  } else {
    // Se o nó é um nó interno, substitui a chave pelo predecessor ou sucessor
    var predecessorNode = nodeToDelete.children[index];
    while (!predecessorNode.isLeaf()) {
      predecessorNode = predecessorNode.children[predecessorNode.children.length - 1];
    }
    var predecessorKey = predecessorNode.keys.pop();
    nodeToDelete.keys[index] = predecessorKey;

    // Trata underflow no nó predecessor
    if (predecessorNode.keys.length < Math.ceil(this.tree.order / 2) - 1) {
      this.handleUnderflow(predecessorNode);
    }
  }

  // Trata underflow se necessário
  if (nodeToDelete.keys.length < Math.ceil(this.tree.order / 2) - 1 && !nodeToDelete.isRoot()) {
    this.handleUnderflow(nodeToDelete);
  }

  return true; // Deletado com sucesso
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

  // Se o pai é a raiz e agora não tem chaves, faz o leftSibling a nova raiz
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

  // Se o pai é a raiz e agora não tem chaves, faz o node a nova raiz
  if (parent.isRoot() && parent.keys.length === 0) {
    this.tree.root = node;
    node.parent = null;
  }
}
