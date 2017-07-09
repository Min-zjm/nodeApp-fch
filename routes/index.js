var express = require('express');
var router = express.Router();

/* GET home page. */
// 使用了 两个页面
router.get('/', function(req, res, next) {  // localhost:3000/
  res.redirect('/Test_html.html');
  // 重现定向 url localhost:3000/html/Test_html.html
});
router.get('/f', function(req, res, next) {  // localhost:3000/
    res.redirect('/Test_from.html');
    // 重现定向 url localhost:3000/html/Test_html.html
});


module.exports = router;
