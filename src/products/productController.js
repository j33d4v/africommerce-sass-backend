const {Products, RatingsModel} = require('../../model/products')
const Category = require("../../model/categories")


const createProduct = async (req, res, next) => {
  /**
   * create new product with required parameters
   */
  const productToSave = new Products({
    name: req.body.name,
    brand_name: req.body.brand_name,
    category: req.body.category,
    quantity: req.body.quantity,
    price: req.body.price,
    desc: req.body.desc,
    owner_id: req.user.id,
    rating: req.body.rating,
    images: req.body.images,
  })

  if (req.body.product_details) {
    productToSave.product_details = req.body.product_details
  }

  if (req.body.warranty) {
    productToSave.warranty = req.body.warranty
  }

  const category = await Category.findOne({ category_name: req.body.category })
  if (!category) {
    productToSave.category = null
  }
  productToSave.category = category.id

  const savedProduct = await productToSave.save()

  res.status(201).json({
    status: true,
    product: savedProduct,
  })
}

const getAllProducts = async (req, res) => {
  const products = await Products.find()
  res.status(200).json({ nbHits: products.length, products })

}



const getProduct = async (req, res) => {
  const { id: productID } = req.params// destructured the req.params.id and passed it to var
  const product = await Products.findOne({ _id: productID })
  res.status(200).json({ product })

}

const updateProduct = async (req, res) => {
  const productID = req.params.id
  const { name, price, quantity, desc } = req.body
  const product = await Products.findByIdAndUpdate(productID, req.body, { new: true })
  if (!product) {
    return res.status(404).send("Product to update not found!")
  }
  res.status(200).json({ msg: 'product updated successfully', product })


}

const deleteProduct = async (req, res) => {
  const productID = req.params.id
  const product = await Products.findOneAndDelete({ _id: productID })
  if (!product) {
    return res.status(404).send("Product with this id not found!")
  }
  res.status(200).json({ msg: 'product deleted successfully' })


}


const TopProducts = async (req, res, next) => {
  const products = await Products.aggregate([
    {
      // STAGE 1
      $addFields: {
        ratingSum: {
          $reduce: {
            input: "$ratings",
            initialValue: 0,
            in: {
              $add: ["$$value", "$$this.val"],
            },
          },
        },
      },
    },

    {//STAGE 2
      $addFields: {
        rating: {
          $cond: [
            { $eq: [{ $size: "$ratings" }, 0] },
            0,
            { $divide: ["$ratingSum", { $size: "$ratings" }] },
          ],
        },
      },
    },

    {//STAGE 3
      $sort: { rating: -1 },
    },

    {// STAGE 4
      $project: {
        ratings: 0, __v: 0, ratingSum: 0,
      },
    },

    { $limit: 5 },
  ]);

  return res.status(200).json({
    status: true,
    products,
  });
}


const latestProduct = async (req, res, next) => {
  /*SORT PRODUCTS BY DATE */
  const latestProducts = await Products.find({})
    .sort({ createdAt: "desc" })
    .limit(10);
  res.status(200).json({ status: true, latestProducts: latestProducts });

}

const rateProduct = async (req, res) => {
  /* Add rating to product */
  const productID = req.params.id

  if (!productID) {
      return res.status(404).send("Please provide your rating!")
  }

  const rating = new RatingsModel({
    value : req.body.rating,
    user_id : req.user.id
  })

  const product = await Products.findById(productID)

  if (!product) {
    return res.status(404).send("Product not found!")
  }

  product.ratings = product.ratings.push(rating)

  product.save()
 
  res.status(200).json({ msg: 'Rating added successfully', data: product});

}


module.exports = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  TopProducts,
  latestProduct,
  rateProduct
}
