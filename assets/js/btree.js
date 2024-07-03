// Construtor da árvore B
var BTree = function(order){
  var tree = Object.create(BTree.prototype);
  tree.root = null; // Raiz inicializada como null
  tree.order = order; // Ordem da árvore
  tree.current_leaf_offset = 0; // Offset atual da folha
  tree.unattached_nodes = [[]]; // Array para nós não anexados baseado no offset da folha

  if (tree.order < 3) {
    alert("Order must be 3 or above."); // Ordem deve ser 3 ou maior
    return false;
  }

  return tree;
}

// Cria um nó que pertence a esta árvore
BTree.prototype.createNode = function(keys, children, parent) {
  return BTreeNode(this, keys, children, parent);
}

// Função de busca que retorna o nó folha onde inserir
BTree.prototype.search = function(value, strict){
  if (!this.root) return false; // Se não há raiz, retorna false
  else return this.root.traverse(value, strict); // Caso contrário, percorre a árvore
}

// Função principal de inserção
BTree.prototype.insert = function(value, silent) {

  // Verifica se o valor já existe na árvore
  if (this.search(value, true)) {
    if (!silent) alert("O valor " + value + " já existe!");
    return false;
  }

  this.current_leaf_offset = 0;
  this.unattached_nodes = [[]];

  // 1. Encontra qual folha deve receber o valor inserido
  var target = this.search(value);
  if (!target) {
    // Cria um novo nó raiz
    this.root = this.createNode();
    target = this.root;
  }

  // 2. Aplica target.insert (recursivo)
  target.insert(value);
}

BTree.prototype.addUnattached = function(node, level) {
  this.unattached_nodes[level] = this.unattached_nodes[level] || [];

  // Adiciona nó ao unattached no nível específico
  this.unattached_nodes[level].push(node);

  // Ordena todos os nós não anexados neste nível, em ordem crescente
  this.unattached_nodes[level].sort(function(a, b) {
    first = parseInt(a.keys[0]);
    second = parseInt(b.keys[0]);
    if (first > second) return 1;
    else if (first < second) return -1;
    else return 0;
  });
}

BTree.prototype.removeUnattached = function(node, level) {
  index = this.unattached_nodes[level].indexOf(node);
  if (index > -1) {
    this.unattached_nodes[level].splice(index, 1);
  }
}

// Gera JSON da árvore para ser consumido pelo d3.js
BTree.prototype.toJSON = function() {
  root = this.root;
  return root.toJSON();
}

// Seed na árvore B com "count" números únicos
BTree.prototype.seed = function(count) {
  var list = [];

  upper = 100;
  if (count > 50) upper = count * 2;

  for (var i = 1; i < upper; i++) list.push(i);

  for (var i = 0; i < count; i++) {
    list.sort(function(a, b){ return Math.floor(Math.random() * 3) - 1; })
    current = list.shift();
    this.insert(current, true);
  }
}

BTree.prototype.isEmpty = function() {
  return !this.root;
}

// Funções de deleção
BTree.prototype.delete = function(value) {
  if (!this.root) {
    alert("Árvore vazia!");
    return false; // A árvore está vazia
  }

  if (!this.search(value, true)) {
    alert("O valor " + value + " não existe!");
    return false;
  }

  var deleted = this.root.delete(value);

  // Se a raiz ficou vazia devido à deleção, define a raiz como null ou seu único filho
  if (this.root.keys.length === 0) {
    this.root = this.root.isLeaf() ? null : this.root.children[0];
    if (this.root) this.root.parent = null; // Atualiza o ponteiro de pai da nova raiz
  }

  return deleted;
}
