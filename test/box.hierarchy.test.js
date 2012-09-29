var assert = require('assert');
var uijs = require('..');
var box = uijs.box;
var bind = uijs.bind;

/*

 parent
  |
  +-- child1
  +
  +-- child2
       |
       +-- grandchild1

*/

var parent = box({ id: 'parent' });
var child1 = box({ id: 'child1' });
var child2 = box({ id: 'child2' });
var grandchild1 = box({ id: 'grandchild1' });

// create tree (tests box.add())


assert.ok(parent.children.push(child1));
assert.ok(parent.add(child2));
assert.ok(child2.children.push(grandchild1));
assert(parent.children.length === 2);
assert(child2.children.length === 1);
assert(parent.children[0] === child1);
assert(parent.children[1] === child2);

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
    box({ id: '#child1', c1: true }),
    box({ 
      id: '#child2',
      c2: true,
      children: [ 
        box({ id: '#grandchild1', gc: true }) 
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
    box({ id: '#c1' }),
    box({ id: '#c2' }),
    box({ id: '#c3' }),
    box({ id: '#c4' }),
    box({ id: '#c5' }),
  ],
});

var c1 = parent3.query('#c1');
var c2 = parent3.query('#c2');
var c4 = parent3.query('#c4');

assert.deepEqual(c1.rest().map(function(x) { return x.id; }), [ '#c2', '#c3', '#c4', '#c5' ]);
assert.deepEqual(c2.rest().map(function(x) { return x.id; }), [ '#c1', '#c3', '#c4', '#c5' ]);
assert.deepEqual(c4.rest().map(function(x) { return x.id; }), [ '#c1', '#c2', '#c3', '#c5' ]);

// box.tree()

var root = box({
  id: '#1',
  children: [
    box({ id: '#1.1' }),
    box({ id: '#1.2' }),
    box({ id: '#1.3', children: [
      box({ id: '#1.3.1' }),
      box({ id: '#1.3.2' }),
      box({ id: '#1.3.3' }),
    ] }),
    box({ id: '#1.4', children: [
      box({ id: '#1.4.1' }),
      box({ id: '#1.4.2', children: [
        box({ id: '#1.4.2.1' }),
        box({ id: '#1.4.2.2' }),
      ] }),
      box({ id: '#1.4.2' }),
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

// functional behavior of `children`

parent.bind('children', function() {
  return [ 
    box({ id: 'ch1' }),
    box({ id: 'ch2' }),
  ]
});

// check that even when binding children to a function then 
// the parent on all the children is set correctly (because
// there is a watch on this property in box which fixes it) 
assert(parent.children[0].parent === parent);

assert(parent.children.length === 2);
assert(parent.children[0].id === 'ch1');
assert(parent.children[1].id === 'ch2');

parent.children = [
  box({ id: 'mybox1' }),
  box({ id: 'mybox2' }),
  box({ id: 'mybox3' }),
  box({ 
    id: 'mybox4', 
    children: [
      box({ id: 'mybox4.1' }),
    ],
  }),
];

assert(parent.children.length === 4);
assert(parent.query('mybox2').id === 'mybox2');
assert(parent.get('mybox4').id === 'mybox4');
assert(parent.query('mybox4.1').id === 'mybox4.1');
assert(parent.query('mybox4.1').parent.id === 'mybox4');

// parent does not work in this situation
var p2 = box();
var p2_child = box();
p2.children.push(p2_child);
assert(p2_child.parent);
p2.children; // just call the getter so that parent is set
assert(p2_child.parent);