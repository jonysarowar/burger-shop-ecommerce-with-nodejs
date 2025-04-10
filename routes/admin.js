

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Admin Dashboard Route (With Authentication)
router.get('/', authMiddleware, async (req, res) => {
    const products = await readProductData();
    res.render('admin/admin', { products });
});

// Helper functions
const productsFilePath = path.join(__dirname, '../data/products.json');

function generateProductId() {
    return 'PROD_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function readProductData() {
    try {
        const jsonData = fs.readFileSync(productsFilePath, 'utf8');
        return JSON.parse(jsonData);
    } catch (error) {
        console.error('Error reading product data:', error);
        return [];
    }
}

function writeProductData(products) {
    try {
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing product data:', error);
    }
}

// Multer storage setup for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage });

// Admin Dashboard Route
router.get('/', (req, res) => {
    const products = readProductData();
    res.render('admin/admin', { products });
});

// Upload Product Route
router.post('/product/upload',authMiddleware, upload.single('image'), (req, res) => {
    const { product_name, product_price, product_description } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    const newProduct = {
        id: generateProductId(),
        product_title: product_name,
        product_price,
        product_description,
        image_path: imagePath
    };

    let products = readProductData();
    products.push(newProduct);
    writeProductData(products);

    res.redirect('/admin');
});

// Delete Product Route
router.post('/product/delete/:id',authMiddleware, (req, res) => {
    const productId = req.params.id;
    let products = readProductData();

    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex !== -1) {
        const imagePath = products[productIndex].image_path;
        products.splice(productIndex, 1);
        writeProductData(products);

        // Delete image file if exists
        if (imagePath) {
            const imagePathToDelete = path.join(__dirname, '..', imagePath);
            fs.unlink(imagePathToDelete, (err) => {
                if (err) console.error(`Error deleting image file: ${err}`);
            });
        }

        res.redirect('/admin');
    } else {
        res.status(404).send('Product not found');
    }
});

// Edit Product Route
router.post('/product/edit/:id',authMiddleware, upload.single('image'), (req, res) => {
    const productId = req.params.id;
    const { product_name, product_price, product_description } = req.body;
    let products = readProductData();
    
    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex === -1) {
        return res.status(404).send('Product not found');
    }

    products[productIndex] = {
        ...products[productIndex],
        product_title: product_name,
        product_price,
        product_description,
        image_path: req.file ? `/uploads/${req.file.filename}` : products[productIndex].image_path
    };

    writeProductData(products);
    res.redirect('/admin');
});


// Admin Login
router.get('/login', (req, res) => {
    res.render('admin/login');
});

// router.post('/login', (req, res) => {
//     const { username, password } = req.body;

//     if (username === 'admin' && password === '12345') {
//         req.session.isAdmin = true;
//         res.redirect('/admin');
//     } else {
//         res.alert("paso")
//         res.redirect('/admin/login');
//     }
// });

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === '12345') {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.redirect('/admin/login?error=wrong-password');
    }
});


// Admin Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

module.exports = router;

