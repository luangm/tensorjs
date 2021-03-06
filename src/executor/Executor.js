import IndexOp from "../op/index/IndexOp";
import PairwiseOp from "../op/pairwise/PairwiseOp";
import ReductionOp from "../op/reduction/ReductionOp";
import IndexSetOp from "../op/transform/IndexSetOp";
import TransformOp from "../op/transform/TransformOp";
import ShapeUtils from "../util/ShapeUtils";
import TensorUtils from "../util/TensorUtils";

const singleton = Symbol();

/**
 * Executor class is used to execute Ops
 *
 * The executor implementation may be changed to use multiple threads / workers
 *
 * An parallel optimization for execution could be split the inputs into multiple sub tensors and let worker run on each.
 */
export default class Executor {

  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new Executor();
    }

    return this[singleton];
  }

  /**
   * Runs an op. Does NOT return.
   * The caller is expected to grab result from op.result
   *
   * This function loops through the Tensor with consideration of buffer index
   */
  exec(op) {

    if (op.isSpecial) {
      op.exec();
      return;
    }

    if (op instanceof PairwiseOp) {
      this._execPairwise(op);
      return;
    }

    if (op instanceof TransformOp) {
      this._execTransform(op);
      return;
    }

    if (op instanceof ReductionOp) {
      this._execReduce(op);
      return;
    }

    throw new Error("Cannot Execute Unknown Op");
  }

  execAtDim(op, dim) {
    if (op.isSpecial) {
      op.exec(dim);
      return;
    }

    if (op instanceof IndexOp) {
      this._indexAccum(op, 0, dim, new Array(op.input.rank));
    }

    if (op instanceof IndexSetOp) {
      this._set(op, 0, dim, new Array(op.input.rank));
    }
  }

  _execPairwise(op) {
    switch (op.result.rank) {
      case 0:
        this._execPairwiseScalar(op);
        break;
      case 1:
        this._execPairwiseVector(op);
        break;
      case 2:
        this._execPairwiseMatrix(op);
        break;
      default:
        this._execPairwiseGeneral(op);
        break;
    }
  }

  /**
   * Generalized pairwise ops.
   * @param op {PairwiseOp}
   * @private
   */
  _execPairwiseGeneral(op) {
    let result = op.result.data;
    let shape = op.result.shape;

    let inputBroadShape = ShapeUtils.getBroadcastedShape(op.input.shape, shape);
    let otherBroadShape = ShapeUtils.getBroadcastedShape(op.other.shape, shape);

    let inputReshaped = op.input.reshape(inputBroadShape);
    let otherReshaped = op.other.reshape(otherBroadShape);

    let input = inputReshaped.data;
    let other = otherReshaped.data;

    let inputPointer = 0;
    let otherPointer = 0;
    let resultPointer = 0;

    let rank = shape.length | 0;

    let MEM = []; // [ RevSlots(rank), shape, is, os, rs, ...]
    let iS = new Array(rank).fill(0);
    let oS = new Array(rank).fill(0);
    let rS = new Array(rank).fill(0);

    for (let i = 0; i < rank; i++) {
      MEM.push(0);
    }
    for (let i = 0; i < rank; i++) {
      let r = rank - 1 - i;
      MEM.push(shape[r]);
      iS[i] = (inputBroadShape[r] === 1 ? 0 : inputReshaped.strides[r]) | 0;
      oS[i] = (otherBroadShape[r] === 1 ? 0 : otherReshaped.strides[r]) | 0;
      rS[i] = op.result.strides[r] | 0;
      MEM.push(iS[i] - (i > 0 ? iS[i - 1] * shape[rank - i] : 0));
      MEM.push(oS[i] - (i > 0 ? oS[i - 1] * shape[rank - i] : 0));
      MEM.push(rS[i] - (i > 0 ? rS[i - 1] * shape[rank - i] : 0));
    }

    let index = 0;
    let ptr = 0;
    for (let i = 0; i < result.length; i++) {
      ptr = rank | 0;
      index = 0;
      MEM[0] = (MEM[0] + 1) | 0;

      result[resultPointer] = op.body(input[inputPointer], other[otherPointer]);
      inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
      otherPointer = (otherPointer + MEM[ptr + 2]) | 0;
      resultPointer = (resultPointer + MEM[ptr + 3]) | 0;

      while (MEM[index] === MEM[ptr] && index < rank - 1) {
        MEM[index] = 0;
        index = (index + 1) | 0;
        MEM[index] = (MEM[index] + 1) | 0;
        ptr = (ptr + 4) | 0;
        inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
        otherPointer = (otherPointer + MEM[ptr + 2]) | 0;
        resultPointer = (resultPointer + MEM[ptr + 3]) | 0;
      }
    }
  }

  /**
   * Handling Broadcasting: The input and other must first to be reshaped to be the same rank as the result Shape
   */
  _execPairwiseMatrix(op) {

    let result = op.result.data;
    let shape = op.result.shape;

    let inputBroadShape = ShapeUtils.getBroadcastedShape(op.input.shape, shape);
    let otherBroadShape = ShapeUtils.getBroadcastedShape(op.other.shape, shape);

    let inputReshaped = op.input.reshape(inputBroadShape);
    let otherReshaped = op.other.reshape(otherBroadShape);

    let input = inputReshaped.data;
    let other = otherReshaped.data;

    let inputS0 = (inputBroadShape[0] === 1 ? 0 : inputReshaped.strides[0]) | 0;
    let inputS1 = (inputBroadShape[1] === 1 ? 0 : inputReshaped.strides[1]) | 0;
    let otherS0 = (otherBroadShape[0] === 1 ? 0 : otherReshaped.strides[0]) | 0;
    let otherS1 = (otherBroadShape[1] === 1 ? 0 : otherReshaped.strides[1]) | 0;
    let resultS0 = op.result.strides[0] | 0;
    let resultS1 = op.result.strides[1] | 0;
    let s0 = shape[0] | 0;
    let s1 = shape[1] | 0;

    let iPtr = 0;
    let oPtr = 0;
    let rPtr = 0;

    let inputD0 = (inputS0 - inputS1 * s1) | 0;
    let otherD0 = (otherS0 - otherS1 * s1) | 0;
    let resultD0 = (resultS0 - resultS1 * s1) | 0;

    let inputD1 = inputS1 | 0;
    let otherD1 = otherS1 | 0;
    let resultD1 = resultS1 | 0;

    for (let i = 0; i < s0; i++) {

      for (let j = 0; j < s1; j++) {
        result[rPtr] = op.body(input[iPtr], other[oPtr]);
        iPtr = (iPtr + inputD1) | 0;
        oPtr = (oPtr + otherD1) | 0;
        rPtr = (rPtr + resultD1) | 0;
      }

      iPtr = (iPtr + inputD0) | 0;
      oPtr = (oPtr + otherD0) | 0;
      rPtr = (rPtr + resultD0) | 0;
    }
  }

  _execPairwiseScalar(op) {
    let input = op.input.data;
    let other = op.other.data;
    let result = op.result.data;

    result[0] = op.body(input[0], other[0]);
  }

  _execPairwiseVector(op) {
    let result = op.result.data;
    let shape = op.result.shape;

    let inputBroadShape = ShapeUtils.getBroadcastedShape(op.input.shape, shape);
    let otherBroadShape = ShapeUtils.getBroadcastedShape(op.other.shape, shape);

    let inputReshaped = op.input.reshape(inputBroadShape);
    let otherReshaped = op.other.reshape(otherBroadShape);

    let input = inputReshaped.data;
    let other = otherReshaped.data;

    let inputS0 = (inputBroadShape[0] === 1 ? 0 : inputReshaped.strides[0]) | 0;
    let otherS0 = (otherBroadShape[0] === 1 ? 0 : otherReshaped.strides[0]) | 0;
    let resultS0 = op.result.strides[0] | 0;
    let s0 = shape[0] | 0;

    let iPtr = 0;
    let oPtr = 0;
    let rPtr = 0;

    for (let i = 0; i < s0; i++) {
      result[rPtr] = op.body(input[iPtr], other[oPtr]);
      iPtr = (iPtr + inputS0) | 0;
      oPtr = (oPtr + otherS0) | 0;
      rPtr = (rPtr + resultS0) | 0;
    }
  }

  _execReduce(op) {
    switch (op.result.rank) {
      case 0:
      case 1:
        this._execReduceVector(op);
        break;
      case 2:
        this._execReduceMatrix(op);
        break;
      default:
        this._execReduceGeneral(op);
        break;
    }
  }

  _execReduceGeneral(op) {
    let reducedDims = op.reducedDims;
    let input = op.input.data;
    let result = op.result.data;
    if (op.initialValue !== 0) {
      op.result.fill(op.initialValue);
    }

    let shape = op.input.shape;
    let rank = shape.length | 0;

    let inputPointer = 0;
    let resultPointer = 0;

    let MEM = []; // [ RevSlots(rank), shape, is, rs, ...]
    let iS = new Array(rank).fill(0);
    let rS = new Array(rank).fill(0);

    for (let i = 0; i < rank; i++) {
      MEM.push(0);
    }
    for (let i = 0; i < rank; i++) {
      let r = rank - 1 - i;
      MEM.push(shape[r]);
      iS[i] = op.input.strides[r] | 0;
      rS[i] = (reducedDims[r] ? 0 : op.result.strides[r]) | 0;
      MEM.push(iS[i] - (i > 0 ? iS[i - 1] * shape[rank - i] : 0));
      MEM.push(rS[i] - (i > 0 ? rS[i - 1] * shape[rank - i] : 0));
    }

    let index = 0;
    let ptr = 0;
    for (let i = 0; i < input.length; i++) {
      ptr = rank | 0;
      index = 0;
      MEM[0] = (MEM[0] + 1) | 0;

      let value = op.body(input[inputPointer]);
      result[resultPointer] = op.update(result[resultPointer], value);
      inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
      resultPointer = (resultPointer + MEM[ptr + 2]) | 0;

      while (MEM[index] === MEM[ptr] && index < rank - 1) {
        MEM[index] = 0;
        index = (index + 1) | 0;
        MEM[index] = (MEM[index] + 1) | 0;
        ptr = (ptr + 3) | 0;
        inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
        resultPointer = (resultPointer + MEM[ptr + 2]) | 0;
      }
    }

    if (op.shouldPostProcess) {
      let n = 1;
      for (let i = 0; i < reducedDims.length; i++) {
        if (reducedDims[i]) {
          n *= shape[i];
        }
      }

      for (let i = 0; i < result.length; i++) {
        result[i] = op.getResult(result[i], n);
      }
    }
  }

  _execReduceMatrix(op) {
    let reducedDims = op.reducedDims;
    let input = op.input.data;
    let result = op.result.data;
    if (op.initialValue !== 0) {
      op.result.fill(op.initialValue);
    }

    let inputStrides = op.input.strides;
    let resultStrides = op.result.strides;

    let shape = op.input.shape; // accumulate around input, not the result
    let s0 = shape[0];
    let s1 = shape[1];
    let is0 = inputStrides[0];
    let is1 = inputStrides[1];
    let rs0 = reducedDims[0] ? 0 : resultStrides[0];
    let rs1 = reducedDims[1] ? 0 : resultStrides[1];

    for (let i = 0; i < s0; i++) {
      for (let j = 0; j < s1; j++) {
        let inputPointer = i * is0 + j * is1;
        let resultPointer = i * rs0 + j * rs1;
        let value = op.body(input[inputPointer]);
        result[resultPointer] = op.update(result[resultPointer], value);
      }
    }

    if (op.shouldPostProcess) {
      let n = 1;
      for (let i = 0; i < reducedDims.length; i++) {
        if (reducedDims[i]) {
          n *= shape[i];
        }
      }

      for (let i = 0; i < result.length; i++) {
        result[i] = op.getResult(result[i], n);
      }
    }
  }

  _execReduceVector(op) {
    let input = op.input.data;
    let result = op.result.data;
    if (op.initialValue !== 0) {
      op.result.fill(op.initialValue);
    }

    for (let i = 0; i < input.length; i++) {
      let value = op.body(input[i]);
      result[0] = op.update(result[0], value);
    }

    if (op.shouldPostProcess) {
      let n = input.length;
      result[0] = op.getResult(result[0], n);
    }
  }

  _execTransform(op) {
    switch (op.result.rank) {
      case 0:
      case 1:
        this._execTransformVector(op);
        break;
      case 2:
        this._execTransformMatrix(op);
        break;
      default:
        this._execTransformGeneral(op);
        break;
    }
  }

  _execTransformGeneral(op) {
    let input = op.input.data;
    let result = op.result.data;
    let shape = op.result.shape;
    let rank = shape.length | 0;

    let inputPointer = 0;
    let resultPointer = 0;

    let MEM = []; // [ RevSlots(rank), shape, is, rs, ...]
    let iS = new Array(rank).fill(0);
    let rS = new Array(rank).fill(0);

    for (let i = 0; i < rank; i++) {
      MEM.push(0);
    }
    for (let i = 0; i < rank; i++) {
      let r = rank - 1 - i;
      MEM.push(shape[r]);
      iS[i] = op.input.strides[r] | 0;
      rS[i] = op.result.strides[r] | 0;
      MEM.push(iS[i] - (i > 0 ? iS[i - 1] * shape[rank - i] : 0));
      MEM.push(rS[i] - (i > 0 ? rS[i - 1] * shape[rank - i] : 0));
    }

    let index = 0;
    let ptr = 0;
    for (let i = 0; i < result.length; i++) {
      ptr = rank | 0;
      index = 0;
      MEM[0] = (MEM[0] + 1) | 0;

      result[resultPointer] = op.body(input[inputPointer]);
      inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
      resultPointer = (resultPointer + MEM[ptr + 2]) | 0;

      while (MEM[index] === MEM[ptr] && index < rank - 1) {
        MEM[index] = 0;
        index = (index + 1) | 0;
        MEM[index] = (MEM[index] + 1) | 0;
        ptr = (ptr + 3) | 0;
        inputPointer = (inputPointer + MEM[ptr + 1]) | 0;
        resultPointer = (resultPointer + MEM[ptr + 2]) | 0;
      }
    }
  }

  _execTransformMatrix(op) {
    let input = op.input.data;
    let result = op.result.data;

    let inputStrides = op.input.strides;
    let resultStrides = op.result.strides;

    let shape = op.result.shape;

    for (let i = 0; i < shape[0]; i++) {
      for (let j = 0; j < shape[1]; j++) {
        let inputPointer = i * inputStrides[0] + j * inputStrides[1];
        let resultPointer = i * resultStrides[0] + j * resultStrides[1];

        result[resultPointer] = op.body(input[inputPointer]);
      }
    }
  }

  _execTransformVector(op) {
    let input = op.input.data;
    let result = op.result.data;

    for (let i = 0; i < result.length; i++) {
      result[i] = op.body(input[i]);
    }
  }

  _indexAccum(op, currentDim, targetDim, indices) {
    let input = op.input;
    let result = op.result;

    if (currentDim === input.rank) {
      let accum = 0;
      let accumIndex = -1;
      for (let i = 0; i < input.shape[targetDim]; i++) {
        indices[targetDim] = i;
        let offset = TensorUtils.computeOffset(indices, input.shape, input.strides);
        let val = input.data[offset];
        let update = op.update(accum, val, accumIndex, i);
        accum = update[0];
        accumIndex = update[1];
      }

      indices[targetDim] = 0;
      let offset = TensorUtils.computeOffset(indices, result.shape, result.strides);
      result.data[offset] = accumIndex;
      return;
    }

    // When encounter the target dim, set the result indices[dim] = 0
    if (currentDim === targetDim) {
      indices[currentDim] = 0;
      this._indexAccum(op, currentDim + 1, targetDim, indices);
    } else {
      for (let i = 0; i < input.shape[currentDim]; i++) {
        indices[currentDim] = i;
        this._indexAccum(op, currentDim + 1, targetDim, indices);
      }
    }
  }

  _set(op, currentDim, targetDim, indices) {
    let input = op.input;
    let args = op.other;
    let result = op.result;

    for (let i = 0; i < input.length; i++) {
      indices[targetDim] = args.get([i]);
      indices[1] = i;
      let val = input.data[i];
      result.set(indices, val);
    }
  }
}