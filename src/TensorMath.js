import Executor from "./executor/Executor";
import MaxIndexOp from "./op/index/MaxIndexOp";
import AddOp from "./op/pairwise/AddOp";
import DivideOp from "./op/pairwise/DivideOp";
import MaxOp from "./op/pairwise/MaxOp";
import MinOp from "./op/pairwise/MinOp";
import ModOp from "./op/pairwise/ModOp";
import MultiplyOp from "./op/pairwise/MultiplyOp";
import SubtractOp from "./op/pairwise/SubtractOp";
import ReduceMaxOp from "./op/reduction/ReduceMaxOp";
import ReduceMeanOp from "./op/reduction/ReduceMeanOp";
import ReduceMinOp from "./op/reduction/ReduceMinOp";
import ReduceProdOp from "./op/reduction/ReduceProdOp";
import ReduceSumOp from "./op/reduction/ReduceSumOp";
import MatMulOp from "./op/special/MatMulOp";
import AbsOp from "./op/transform/AbsOp";
import AcoshOp from "./op/transform/AcoshOp";
import AcosOp from "./op/transform/AcosOp";
import AsinhOp from "./op/transform/AsinhOp";
import AsinOp from "./op/transform/AsinOp";
import AtanhOp from "./op/transform/AtanhOp";
import AtanOp from "./op/transform/AtanOp";
import CoshOp from "./op/transform/CoshOp";
import CosOp from "./op/transform/CosOp";
import EluOp from "./op/transform/EluOp";
import Expm1Op from "./op/transform/Expm1Op";
import ExpOp from "./op/transform/ExpOp";
import IndexSetOp from "./op/transform/IndexSetOp";
import Log1pOp from "./op/transform/Log1pOp";
import LogOp from "./op/transform/LogOp";
import NegateOp from "./op/transform/NegateOp";
import ReciprocalOp from "./op/transform/ReciprocalOp";
import ReluOp from "./op/transform/ReluOp";
import RoundOp from "./op/transform/RoundOp";
import RSqrtOp from "./op/transform/RSqrtOp";
import SetOp from "./op/transform/SetOp";
import SigmoidGradOp from "./op/transform/SigmoidGradOp";
import SigmoidOp from "./op/transform/SigmoidOp";
import SignOp from "./op/transform/SignOp";
import SinhOp from "./op/transform/SinhOp";
import SinOp from "./op/transform/SinOp";
import SoftmaxOp from "./op/transform/SoftmaxOp";
import SqrtGradOp from "./op/transform/SqrtGradOp";
import SqrtOp from "./op/transform/SqrtOp";
import SquareOp from "./op/transform/SquareOp";
import StepOp from "./op/transform/StepOp";
import TanGradOp from "./op/transform/TanGradOp";
import TanhOp from "./op/transform/TanhOp";
import TanOp from "./op/transform/TanOp";
import Tensor from "./Tensor";
import ShapeUtils from "./util/ShapeUtils";
import TensorUtils from "./util/TensorUtils";

export default class TensorMath {

  // DONE
  static abs(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AbsOp(base, null, result));
    return result;
  }

  // DONE
  static acos(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AcosOp(base, null, result));
    return result;
  }

  // DONE
  static acosh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AcoshOp(base, null, result));
    return result;
  }

  // DONE
  static add(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new AddOp(left, right, result));
    return result;
  }

  static addN(items) {

  }

  static argMax(base, dim) {
    let resultShape = base.shape.slice();
    resultShape[dim] = 1;
    let result = new Tensor({shape: resultShape});
    let op = new MaxIndexOp(base, null, result);
    Executor.instance.execAtDim(op, dim);

    resultShape = base.shape.slice();
    resultShape.splice(dim, 1);

    return result.reshape(resultShape);
  }

  static argSet(source, args, shape, dim) {
    let result = new Tensor({shape: shape});
    let op = new IndexSetOp(source, args, result);
    Executor.instance.execAtDim(op, dim);
    return result;
  }

  // DONE
  static asin(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AsinOp(base, null, result));
    return result;
  }

  // DONE
  static asinh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AsinhOp(base, null, result));
    return result;
  }

  // DONE
  static atan(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AtanOp(base, null, result));
    return result;
  }

  // DONE
  static atanh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new AtanhOp(base, null, result));
    return result;
  }

  static conv2d(image, kernel) {

    let xCol = TensorUtils.im2col(image, kernel.shape);

    let numImages = image.shape[0];
    let channels = image.shape[1];
    let height = image.shape[2]; // rows
    let width = image.shape[3]; // cols

    let numKernels = kernel.shape[0];
    let kernelChannels = kernel.shape[1];
    let kernelHeight = kernel.shape[2]; // rows
    let kernelWidth = kernel.shape[3]; // cols

    let outputHeight = TensorUtils.computeConv2dOutSize(height, kernelHeight);
    let outputWidth = TensorUtils.computeConv2dOutSize(width, kernelWidth);

    let kCol = kernel.reshape([numKernels, kernelChannels * kernelWidth * kernelHeight]);
    let result = TensorMath.matmul(kCol, xCol);
    let reshaped = result.reshape([numKernels, numImages, outputHeight, outputWidth]);
    let transposed = reshaped.transpose([1, 0, 2, 3]);
    return transposed;
  }

  static conv2dImageGrad(image, kernel, grad) {
    let numKernels = kernel.shape[0];

    let gradReshape = grad.reshape([numKernels, grad.length / numKernels]);
    let kReshape = kernel.reshape([numKernels, kernel.length / numKernels]);
    let col = TensorMath.matmul(kReshape, gradReshape, true, false);

    return TensorUtils.col2im(col, image, kernel).reshape(image.shape);
  }

  static conv2dKernelGrad(image, kernel, grad) {
    let numKernels = kernel.shape[0];
    let xCol = TensorUtils.im2col(image, kernel);
    let gradReshape = grad.reshape([numKernels, grad.length / numKernels]);
    return TensorMath.matmul(gradReshape, xCol, false, true).reshape(kernel.shape);
  }

  // DONE
  static cos(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new CosOp(base, null, result));
    return result;
  }

  // DONE
  static cosh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new CoshOp(base, null, result));
    return result;
  }

  // DONE
  static divide(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new DivideOp(left, right, result));
    return result;
  }

  /**
   * Computes the Elu Activation
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static elu(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new EluOp(base, null, result));
    return result;
  }

  // DONE
  static exp(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new ExpOp(base, null, result));
    return result;
  }

  // DONE
  static expm1(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new Expm1Op(base, null, result));
    return result;
  }

  static gradientDescentStep(node, grad, learnRate) {
    let lr = Tensor.create(learnRate);
    let mul = TensorMath.multiply(lr, grad);
    return TensorMath.subtract(node, mul);
  }

  // DONE
  static log(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new LogOp(base, null, result));
    return result;
  }

  // DONE
  static log1p(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new Log1pOp(base, null, result));
    return result;
  }

  static logSumExp(base, dim = -1) {
    if (dim < 0) {
      dim += base.rank;
    }
    let max = TensorMath.reduceMax(base, dim, true);
    let subtract = TensorMath.subtract(base, max);
    let exp = TensorMath.exp(subtract);
    let sum = TensorMath.reduceSum(exp, dim, true);
    let log = TensorMath.log(sum);
    return TensorMath.add(log, max);
  }

  static matmul(left, right, transposeA = false, transposeB = false, result) {
    if (left.rank !== 2 || right.rank !== 2) {
      throw new Error('Invalid Operation, Rank of left and right must be 2');
    }

    let shape = [0, 0];
    shape[0] = transposeA ? left.shape[1] : left.shape[0];
    shape[1] = transposeB ? right.shape[0] : right.shape[1];
    result = result || new Tensor({shape});
    Executor.instance.exec(new MatMulOp(left, right, result, transposeA, transposeB));
    return result;
  }

  // DONE
  static max(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new MaxOp(left, right, result));
    return result;
  }

  static maxPool(image, kernelShape, strideWidth, strideHeight) {

    let numImages = image.shape[0];
    let channels = image.shape[1];
    let height = image.shape[2]; // rows
    let width = image.shape[3]; // cols

    let numKernels = kernelShape[0];
    let kernelChannels = kernelShape[1];
    let kernelHeight = kernelShape[2]; // rows
    let kernelWidth = kernelShape[3]; // cols

    let outputHeight = TensorUtils.computeConv2dOutSize(height, kernelHeight, 0, strideHeight);
    let outputWidth = TensorUtils.computeConv2dOutSize(width, kernelWidth, 0, strideWidth);

    let xCol = TensorUtils.im2col(image, kernelShape, {strideWidth, strideHeight});
    let max = TensorMath.reduceMax(xCol, 0);
    let result = max.reshape([numImages, channels, outputHeight, outputWidth]);
    return result;
  }

  static maxPoolGrad(image, kernel, grad, {strideWidth, strideHeight}) {
    let xCol = TensorUtils.im2col(image, kernel.shape, {strideWidth, strideHeight});
    let argmax = TensorMath.argMax(xCol, 0);
    let gradReshape = grad.reshape([1, grad.length]);
    let set = TensorMath.argSet(gradReshape, argmax, xCol.shape, 0);
    let result = TensorUtils.col2im(set, image, kernel, {strideWidth, strideHeight}).reshape(image.shape);
    return result;
  }

  // DONE
  static min(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new MinOp(left, right, result));
    return result;
  }

  // DONE
  static mod(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new ModOp(left, right, result));
    return result;
  }

  // DONE
  static multiply(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new MultiplyOp(left, right, result));
    return result;
  }

  // DONE
  static negate(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new NegateOp(base, null, result));
    return result;
  }

  // DONE
  static reciprocal(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new ReciprocalOp(base, null, result));
    return result;
  }

  /**
   * Reduce Max
   *
   * @param {Tensor} base
   * @param {int|int[]} [dims] dims to be reduced
   * @param {boolean} [keepDims] If keepDims, the dims are kept at 1
   * @returns {Tensor}
   */
  static reduceMax(base, dims = -1, keepDims = false) {
    let reducedDims = ShapeUtils.getReducedDims(base.shape, dims);
    let resultShape = ShapeUtils.reduceShape(base.shape, dims, true);
    let result = new Tensor({shape: resultShape});
    Executor.instance.exec(new ReduceMaxOp(base, null, result, {reducedDims}));
    if (keepDims) {
      return result;
    }
    let reducedShape = ShapeUtils.reduceShape(base.shape, dims, false);
    return result.reshape(reducedShape);
  }

  /**
   * Reduce Mean
   *
   * @param {Tensor} base
   * @param {int|int[]} [dims] dims to be reduced
   * @param {boolean} [keepDims] If keepDims, the dims are kept at 1
   * @returns {Tensor}
   */
  static reduceMean(base, dims = -1, keepDims = false) {
    let reducedDims = ShapeUtils.getReducedDims(base.shape, dims);
    let resultShape = ShapeUtils.reduceShape(base.shape, dims, true);
    let result = new Tensor({shape: resultShape});
    Executor.instance.exec(new ReduceMeanOp(base, null, result, {reducedDims}));
    if (keepDims) {
      return result;
    }
    let reducedShape = ShapeUtils.reduceShape(base.shape, dims, false);
    return result.reshape(reducedShape);
  }

  /**
   * Reduce Min
   *
   * @param {Tensor} base
   * @param {int|int[]} [dims] dims to be reduced
   * @param {boolean} [keepDims] If keepDims, the dims are kept at 1
   * @returns {Tensor}
   */
  static reduceMin(base, dims = -1, keepDims = false) {
    let reducedDims = ShapeUtils.getReducedDims(base.shape, dims);
    let resultShape = ShapeUtils.reduceShape(base.shape, dims, true);
    let result = new Tensor({shape: resultShape});
    Executor.instance.exec(new ReduceMinOp(base, null, result, {reducedDims}));
    if (keepDims) {
      return result;
    }
    let reducedShape = ShapeUtils.reduceShape(base.shape, dims, false);
    return result.reshape(reducedShape);
  }

  /**
   * Reduce Prod
   *
   * @param {Tensor} base
   * @param {int|int[]} [dims] dims to be reduced
   * @param {boolean} [keepDims] If keepDims, the dims are kept at 1
   * @returns {Tensor}
   */
  static reduceProd(base, dims = -1, keepDims = false) {
    let reducedDims = ShapeUtils.getReducedDims(base.shape, dims);
    let resultShape = ShapeUtils.reduceShape(base.shape, dims, true);
    let result = new Tensor({shape: resultShape});
    Executor.instance.exec(new ReduceProdOp(base, null, result, {reducedDims}));
    if (keepDims) {
      return result;
    }
    let reducedShape = ShapeUtils.reduceShape(base.shape, dims, false);
    return result.reshape(reducedShape);
  }

  /**
   * Reduce Sum
   *
   * @param {Tensor} base
   * @param {int|int[]} [dims] dims to be reduced
   * @param {boolean} [keepDims] If keepDims, the dims are kept at 1
   * @returns {Tensor}
   */
  static reduceSum(base, dims = -1, keepDims = false) {
    let reducedDims = ShapeUtils.getReducedDims(base.shape, dims);
    let resultShape = ShapeUtils.reduceShape(base.shape, dims, true);
    let result = new Tensor({shape: resultShape});
    Executor.instance.exec(new ReduceSumOp(base, null, result, {reducedDims}));
    if (keepDims) {
      return result;
    }
    let reducedShape = ShapeUtils.reduceShape(base.shape, dims, false);
    return result.reshape(reducedShape);
  }

  /**
   * Computes the Relu Activation
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static relu(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new ReluOp(base, null, result));
    return result;
  }

  /**
   * Round to nearest integer
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static round(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new RoundOp(base, null, result));
    return result;
  }

  static rsqrt(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new RSqrtOp(base, null, result));
    return result;
  }

  // DONE
  static set(base, scalar) {
    Executor.instance.exec(new SetOp(base, null, base, {scalar}));
    return base;
  }

  /**
   * Sigmoid Activation
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static sigmoid(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SigmoidOp(base, null, result));
    return result;
  }

  static sigmoidGrad(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new SigmoidGradOp(base, null, result));
    return result;
  }

  /**
   * Sign of the value
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static sign(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SignOp(base, null, result));
    return result;
  }

  /**
   * Sine Function
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static sin(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SinOp(base, null, result));
    return result;
  }

  /**
   * Hyper Sine Function
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static sinh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SinhOp(base, null, result));
    return result;
  }

  static softmax(base, dim = -1) {
    if (dim < 0) {
      dim += base.rank;
    }
    let max = TensorMath.reduceMax(base, dim);
    let subtract = TensorMath.subtract(base, max);
    let exp = TensorMath.exp(subtract);
    let sum = TensorMath.reduceSum(exp, dim);
    return TensorMath.divide(exp, sum);
  }

  static softmax2(base, dim = -1, result) {
    if (dim < 0) {
      dim += base.rank;
    }
    result = result || new Tensor({shape: base.shape});
    Executor.instance.execAtDim(new SoftmaxOp(base, null, result), dim);
    return result;
  }

  static softmaxCrossEntropyGrad(labels, logits) {
    let softmax = TensorMath(logits);
    return TensorMath.subtract(softmax, labels);
  }

  static softmaxCrossEntropyWithLogits(labels, logits, dim = -1) {
    if (dim < 0) {
      dim += logits.rank;
    }
    let logSumExp = TensorMath.logSumExp(logits);
    let sub = TensorMath.subtract(logits, logSumExp);
    let mul = TensorMath.multiply(labels, sub);
    let sum = TensorMath.reduceSum(mul, dim);
    return TensorMath.negate(sum);
  }

  /**
   * Normally a softmax derivative is a Jacobian Matrix.
   * To get a total derivative, sum up all the partials.
   *
   * Assume shape of base = [batch, elements]
   */
  static softmaxGrad(base, grad) {
    let softmax = TensorMath.softmax(base); // default dim = -1
    let mul = TensorMath.multiply(grad, softmax);
    let sum = TensorMath.reduceSum(mul, 1); // reduce on last dim
    let subtract = TensorMath.subtract(grad, sum); // Sum will broadcast
    return TensorMath.multiply(subtract, softmax);
  }


  /**
   * Square Root
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static sqrt(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SqrtOp(base, null, result));
    return result;
  }

  static sqrtGrad(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new SqrtGradOp(base, null, result));
    return result;
  }

  /**
   * Square
   *
   * @param {Tensor} base
   * @param {Tensor} [result]
   * @return {Tensor}
   */
  static square(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new SquareOp(base, null, result));
    return result;
  }

  static step(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new StepOp(base, null, result));
    return result;
  }

  static subtract(left, right, result) {
    result = result || new Tensor({shape: ShapeUtils.broadcastShapes(left.shape, right.shape)});
    Executor.instance.exec(new SubtractOp(left, right, result));
    return result;
  }

  static sumSquaredError(label, prediction) {
    let sub = TensorMath.subtract(label, prediction);
    let sqr = TensorMath.square(sub);
    return TensorMath.reduceSum(sqr, -1);
  }

  static tan(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new TanOp(base, null, result));
    return result;
  }

  static tanGrad(base) {
    let result = new Tensor({shape: base.shape});
    Executor.instance.exec(new TanGradOp(base, null, result));
    return result;
  }

  /**
   *
   * @param base
   * @param result
   * @return {*|Tensor}
   */
  static tanh(base, result) {
    result = result || new Tensor({shape: base.shape});
    Executor.instance.exec(new TanhOp(base, null, result));
    return result;
  }

  // TODO: This is a Hack. TB Fixed
  static tile(base, repeats) {
    let shape = base.shape.slice();
    for (let i = 0; i < shape.length; i++) {
      shape[i] *= repeats[i];
    }
    let result = new Tensor({shape});
    Executor.instance.exec(new SetOp(result, null, result, {scalar: base.data[0]}));
    return result;
  }
}