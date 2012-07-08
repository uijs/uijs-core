var assert = require('assert');
var uijs = require('..');
var box = uijs.box;
var c = uijs.util.constant;

/*

 parent
  |
  +-- child1
  +
  +-- child2
       |
       +-- grandchild1

*/

var parent = box();
var child1 = box();
var child2 = box();
var grandchild1 = box();

// create tree (tests box.add())
assert.equal(parent.add(child1), child1);
assert.equal(parent.add(child2), child2);
assert.equal(child2.add(grandchild1), grandchild1);

// assert relationships
assert.equal(child1.parent, parent);
assert.equal(child2.parent, parent);
assert.equal(grandchild1.parent, child2);

// box.root()
assert.equal(parent.root(), parent);
assert.equal(grandchild1.root(), parent);
assert.equal(child1.root(), parent);
assert.equal(child2.root(), parent);

// box.siblings()
var siblings = child1.siblings();
assert.equal(siblings.length, 2);
assert.equal(siblings[0], child1);
assert.equal(siblings[1], child2);
assert.equal(parent.siblings().length, 1);
assert.equal(grandchild1.siblings().length, 1);

// box.first()
assert.equal(parent.first(), child1);
assert.equal(child2.first(), grandchild1);

// box.prev()
assert.equal(child1.prev(), null);
assert.equal(child2.prev(), child1);

// box.tofront()
child1.tofront();
assert.equal(child1.prev(), child2);
assert.equal(child2.prev(), null);

// box.remove([child])
assert.equal(parent.all().length, 2);
parent.remove(child1);
assert.equal(parent.all().length, 1);
child2.remove();
assert.equal(parent.all().length, 0);

// box.children[]
var parent2 = box({ 
  children: [
    box({ id: c('#child1'), c1: true }),
    box({ 
      id: c('#child2'),
      c2: true,
      children: [ 
        box({ id: c('#grandchild1'), gc: true }) 
      ],
    }),
  ], 
});

assert.equal(parent2.all().length, 2);

// box.get(id)
assert(parent2.get('#child1').c1);
assert(parent2.get('#child2').c2);
assert(!parent2.get('#grandchild1')); // not a direct child

// box.query(id) - query looks down the tree
assert(parent2.query('#grandchild1').gc);
assert(parent2.query('#child1').c1);
assert(parent2.query('#child2').c2);

// box.empty()
assert.equal(parent2.query('#child2').all().length, 1);
parent2.query('#child2').empty();
assert.equal(parent2.query('#child2').all().length, 0);
parent2.empty();
assert.equal(parent2.all().length, 0);

// box.rest()
var parent3 = box({
  children: [
    box({ id: c('#c1') }),
    box({ id: c('#c2') }),
    box({ id: c('#c3') }),
    box({ id: c('#c4') }),
    box({ id: c('#c5') }),
  ],
});

var c1 = parent3.query('#c1');
var c2 = parent3.query('#c2');
var c4 = parent3.query('#c4');

assert.deepEqual(c1.rest().map(function(x) { return x.id(); }), [ '#c2', '#c3', '#c4', '#c5' ]);
assert.deepEqual(c2.rest().map(function(x) { return x.id(); }), [ '#c1', '#c3', '#c4', '#c5' ]);
assert.deepEqual(c4.rest().map(function(x) { return x.id(); }), [ '#c1', '#c2', '#c3', '#c5' ]);

// box.tree()

var root = box({
  id: c('#1'),
  children: [
    box({ id: c('#1.1') }),
    box({ id: c('#1.2') }),
    box({ id: c('#1.3'), children: [
      box({ id: c('#1.3.1') }),
      box({ id: c('#1.3.2') }),
      box({ id: c('#1.3.3') }),
    ] }),
    box({ id: c('#1.4'), children: [
      box({ id: c('#1.4.1') }),
      box({ id: c('#1.4.2'), children: [
        box({ id: c('#1.4.2.1') }),
        box({ id: c('#1.4.2.2') }),
      ] }),
      box({ id: c('#1.4.2') }),
    ] }),
  ],
});

var expected = [
  '#1',
  '  #1.1',
  '  #1.2',
  '  #1.3',
  '    #1.3.1',
  '    #1.3.2',
  '    #1.3.3',
  '  #1.4',
  '    #1.4.1',
  '    #1.4.2',
  '      #1.4.2.1',
  '      #1.4.2.2',
  '    #1.4.2\n',
].join('\n');

assert.equal(root.tree(), expected);