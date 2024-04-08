// Do not worry of you don't get it.
// We only tried to make a wrapper function for async functions which will help us in the future


// Industries Approach 1 using promises
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
      .catch((err) => next(err))
  }
}


//Industries Approach 2
// const asyncHandler = () => { }
// const asyncHandler = (func) => { () => {} }  // Remove only the curly brackets
// const asyncHandler = (func) => () => {}      // This is it;

// const asyncHandler = (func) => async (req, res, next) => {
//   try {
//     await func(req, res, next);
//   } catch (error) {
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message,
//     })
//   }
// }

export default asyncHandler