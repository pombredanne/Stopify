const assert = require('assert')

let x = 0;
let y = 0;
function foo() {
  x++;
  return {
    bar() {
      y++;
    }
  }
}

false || foo().bar();

assert.equal(x,1)
assert.equal(y,1)
