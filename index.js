const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParse = require("body-parser");
const path = require("path");
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const port = 3000;

const db = mysql.createConnection({
    host: "localhost",
      user: "root",
    password: "",
    database: "express-test",
});

db.connect((err) => {
    if (err) {
        return "Database tidak terhubung";
    }
});

app.use(cors());
app.use(bodyParse.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs');
app.use(session({
    secret: 'my-secret',
    resave: true,
    saveUninitialized: true,
}));

function checkLogin(req,res,next){
    if (req.session &&  req.session.user) {
        next();
    }
    else {
        res.redirect('/login');
    }
}

// app.use(checkLogin());
// Routes
app.get('/',checkLogin, (req, res) => {
});

app.get('/dashboard',checkLogin, (req, res) => {
    res.render('dashboard');
})

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const data = req.body;
    // res.json(data);
    if (!data.email || !data.password) {
        return res.status(401).json({
            msg: "Data Tidak Lengkap"
        });
    }

    const checkQuery = 'SELECT * FROM users WHERE email=?';
    db.query(checkQuery, [data.email], async (err, results) => {
        if (results.length === 0) {
            return res.status(401).json({
                msg: "Email Atau Password Salah"
            });
        }

        const checkPassword = await bcrypt.compare(data.password, results[0].password);
        if (!checkPassword) {
            return res.status(401).json({
                msg: "Email Atau Password Salah"
            });
        }

        // Store user data in session if login successful
        req.session.user = {
            id: results[0].id,
            email: results[0].email,
        };

        res.redirect('/dashboard');
    });
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const data = req.body;
    if (!data.email || !data.password) {
        return res.status(400).json({
            msg: "Data Tidak Lengkap"
        });
    }
    const checkQuery = 'select *from users where email=?';
    db.query(checkQuery, [data.email], async (err, results) => {
        if (results.length > 0) {
            return res.status(400).json({
                msg: "Email Sudah Terdaftar"
            })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const insertQuery = 'insert into users(email, password, name) values(?,?,?)';
        db.query(insertQuery, [data.email, hashedPassword, data.name], (err, results) => {
            res.status(201).json({
                msg: "Data User Tersimpan",
                // results
            })
        });
    });
    res.redirect('/dashboar');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
})

app.get('/product/index',checkLogin, (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        // console.log(results);
        res.render('product/index', { products: results });
    });
});

app.get('/product/create',checkLogin, (req, res) => {
    res.render('product/create');
});

app.post('/product/create', (req, res) => {
    insertQuery = 'insert into products (nama,harga,jumlah) values(?,?,?)';
    const data = req.body;
    db.query(insertQuery, [data.namaProduct, data.hargaProduct, data.jumlahProduct], (err, results) => {
        res.redirect('index');
    });
});

app.get('/product/edit/:id',checkLogin, (req, res) => {
    const productId = req.params.id;
    db.query('SELECT * FROM products where id=?', [productId], (err, results) => {
        console.log(results);
        res.render('product/edit', { id: productId, products: results[0] });
    });

});

app.post('/product/edit/:id', (req, res) => {
    const updateQuery = 'UPDATE products SET nama = ?, harga = ?, jumlah = ? WHERE id = ?';
    const data = req.body;
    // const test = 1;
    // console.log(test);
    const productId = req.params.id;
    db.query(updateQuery, [data.namaProduct, data.hargaProduct, data.jumlahProduct, productId], (err, results) => {
        console.log(results);
        res.redirect('/product/index');
    });
});

app.get('/product/delete/:id', (req, res) => {
    const deleteQuery = 'delete from products where id=?';
    const productId = req.params.id
    db.query(deleteQuery, productId, (err, results) => {
        res.redirect('/product/index');
    })
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
})
