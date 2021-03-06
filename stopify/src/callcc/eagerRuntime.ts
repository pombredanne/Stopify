import * as common from './runtime';
import { ElapsedTimeEstimator } from '../elapsedTimeEstimator';

export class EagerRuntime extends common.Runtime {
  eagerStack: common.Stack;

  constructor(yieldInterval: number, estimator: ElapsedTimeEstimator) {
    super(yieldInterval, estimator);
    this.eagerStack = [];
  }

  captureCC(f: (k: any) => any) {
    this.capturing = true;
    throw new common.Capture(f, [...this.eagerStack]);
  }

  makeCont(stack: common.Stack) {
    return (v: any) => {
      this.eagerStack = [...stack];
      throw new common.Restore([this.topK(() => v), ...stack]);
    }
  }

  abstractRun(body: () => any): common.RunResult {
    try {
      const v = body();
      return { type: 'normal', value: v };
    }
    catch (exn) {
      if (exn instanceof common.Capture) {
        this.capturing = false;
        return { type: 'capture', stack: exn.stack, f: exn.f };
      }
      else if (exn instanceof common.Restore) {
        return { type: 'restore', stack: exn.stack };
      }
      else {
        return { type: 'exception', value: exn };
      }
    }
  }

  handleNew(constr: any, ...args: any[]) {
    if (common.knownBuiltIns.includes(constr)) {
      return new constr(...args);
    }

    let obj, result;
    if (this.mode) {

      obj = Object.create(constr.prototype);
    } else {
      const frame = this.stack[this.stack.length - 1];
      if (frame.kind === "rest") {
        [obj] = frame.locals;
      } else {
        throw "bad";
      }
      this.stack.pop();
    }

    if (this.mode) {
      this.eagerStack.unshift({
        kind: "rest",
        f: () => this.handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
      result = constr.apply(obj, args);
      this.eagerStack.shift();
    } else {
      result = this.stack[this.stack.length - 1].f.apply(obj, []);
      this.eagerStack.shift();
    }
    return typeof result === 'object' ? result : obj;
  }
}

export default EagerRuntime;
