var express = require('express');
// 引入express
var router = express.Router();
// 创建路由
/* GET users listing. */
// 路由的使用  router.get   我当前的路由   本级路径 localhost:3000/users
router.get('/', function(req, res, next) {
  res.send('我返回了文字');
});

module.exports = router;
