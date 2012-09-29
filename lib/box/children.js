var box = module.exports = {};

// returns the root of the box hierarchy
box.root = function() {
  var self = this;
  if (!self.parent) return self;
  return self.parent.root();
};

// adds a child to the end of the children's stack.
box.add = box.push = function(child) {
  var self = this;
  if (Array.isArray(child)) {
    return child.forEach(function(c) {
      self.add(c);
    });
  }

  if (!child.is_box) {
    throw new Error('can only add boxes as children to a box');
  }

  child.parent = self;

  var newChildren = [];
  var numOfChildren = self.children.length;
  for (var i = 0; i < numOfChildren; i++) {
    newChildren.push(self.children.shift());
  };

  newChildren.push(child);

  //TODO: this is to make the setter of the property change to
  //      make sure handlers of changed children execute. Need to resolve this hack, also change push, remove, etc..
  self.children = newChildren;
  return child;
};

box.tofront = function() {
  var self = this;
  if (!self.parent) throw new Error('`tofront` requires that the box will have a parent');
  var parent = self.parent;
  parent.remove(self);
  parent.push(self);
  return self;
};

box.siblings = function() {
  var self = this;
  if (!self.parent) return [ self ]; // detached, no siblings but self
  return self.parent.all();
};

box.prev = function() {
  var self = this;
  if (!self.parent) throw new Error('box must be associated with a parent')
  var children = self.parent.children;
  var my_index = children.indexOf(self);
  if (my_index === 0) return null;
  else return children[my_index - 1];
};

// removes a child (or self from parent)
box.remove = function(child) {
  var self = this;

  if (!child) {
    if (!self.parent) throw new Error('`remove()` will only work if you have a parent');
    self.parent.remove(self);
    return child;
  }

  var children = self.children;

  var child_index = children.indexOf(child);
  if (child_index === -1) return;
  children.splice(child_index, 1);
  child.parent = null;
  return child;
};

// removes all children
box.empty = function() {
  var self = this;
  self.children = [];
  return self;
};

// retrieve a child by it's `id()` property (or _id). children without
// this property cannot be retrieved using this function.
box.get = function(id) {
  var self = this;
  var result = self.children.filter(function(child) {
    return child.id === id;
  });

  return result.length === 0 ? null : result[0];
};

// ### box.query(id)
// Retrieves a child from the entire box tree by id.
box.query = function(id) {
  var self = this;
  var child = self.get(id);
  if (child) return child;

  var children = self.children;
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    var result = child.query(id);
    if (result) {
      return result;
    }
  }
};

/// ### box.all()
/// Returns all the children of this box.
box.all = function() {
  var self = this;
  return self.children;
};

/// ### box.rest([child])
/// Returns all the children that are not `child` (or do the same on the parent if `child` is null)
box.rest = function(child) {
  var self = this;
  if (!child) {
    if (!self.parent) throw new Error('cannot call `rest()` without a parent');
    return self.parent.rest(self);
  }

  return self.children.filter(function(c) {
    return c.id !== child.id;
  });
};

// returns the first child
box.first = function() {
  var self = this;
  return self.children[0];
};

// returns a tree representation this box and all it's children
box.tree = function(indent) {
  var self = this;
  indent = indent || 0;

  var s = '';
  for (var i = 0; i < indent; ++i) {
    s += ' ';
  }

  s += self.id + '\n';
  
  self.children.forEach(function(child) {
    s += child.tree(indent + 2);
  });

  return s;
};