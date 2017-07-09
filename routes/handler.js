//实现功能接口
//   前端  --》 数据，‘’ {} ，死的 
//   获取数据 ：后台 
//   接口 ： 方便前端 使用 ajax 调取数据
//    调取 数据  --》 后台  
//     后台  --> 数据库里面找到，得到的结果 --》 res返回给 前端
//              res.send(‘你好’)

// ajax  --> 使用接口  --》 包含我所要去使用的功能
// 写接口  --》 配置道路由上面
// 接口的 逻辑   
var express = require('express'),   //*
    router = express.Router(),        //*
    handler = require('./dbhandler.js'),  //*   dbhandler.js 数据库操作的增删改查
    formidable = require('formidable'),    //*  上传模块
    crypto = require('crypto');     //  加密 ，
var StringDecoder = require('string_decoder').StringDecoder;   //*
var decoder = new StringDecoder('utf8');
                              //var images = require("images");
var fs = require('fs');
var ObjectID = require('mongodb').ObjectID;
// 引入的模块 用来处理 得到的ID 和mongo里面的id的格式不一样的问题
//  定义了一个函数，用来收集用户的登录信息的  容器
function User(user) {
  this.id=user.id;   //暂时不考虑
  this.name = user.name;
  this.password = user.password;
  this.veri = user.veri;
//  veri  ==验证码
};
var flagInt = 0;
//迭代处理删除后的系统管理员各人员的tokenId
var recUpdate = function(req, res, collections,data){
  //   recUpdate(req,res,'Administor',da)   data=da 就是>删除数据的tokenId 的所有数据
  //                                   collections='Administor'
  //   二次修改                data（待修改结果集）=[{5}]  data[0]={5}
  //  三次修改     data（待修改结果集）=[{6}]
  if(data.length===0){ // 删除的 是最后一条数据
    res.end('{"success":"删除成功"}');
  }else{   // 删除的 不是最后一条数据  ===》 修改 tokenId
    var selectors = [  // 修改条件  ？只修改了一条数据里面的 内容   data=[{4},{5},{6}]
      //  data[0]  第一个数据
      {"userName":data[0].userName},   //   保证注册的时候，用户名不要重复
      {$set:                                         // $inc  ---> 作业
      {
        //   修改 这组数据里面的 tokenId  -1
        "tokenId":data[0].tokenId-1
      }
      }
    ];

    req.query.action = 'update';  // 确定了 数据库的操作方式
    handler(req, res, collections, selectors,function(dat){
      //  data=[{3},{5},{6}]
      //  data（待修改结果集）=[{4},{6}]
      //  三次 data（待修改结果集）=[{5}]
      data.shift();    //  data（待修改结果集）=[{5},{6}]  二次 data（待修改结果集）=[{6}]  三次 data[]
     if(data.length!=0){      // D --》【5】  D.LENGTH !=0
        //console.log(data);   //D-->[{5}]
        recUpdate(req, res, collections,data);  // 重新调用自身
      //   data（待修改结果集）=[{5},{6}]
      //   data（待修改结果集）=[{6}]
      }else{
       //  data（待修改结果集）=[]
        res.end('{"success":"更新成功"}');
      }
    });
  }
}
//迭代处理课程列表删除后的ID
var recUpdateID = function(req, res, collections,data,fn){
  //  collections ---》 我要去迭代的 那个集合
  //  data  待处理的 结果集
  //  第二次   data =[{ID：5}]
  if(data.length===0){   //  data 里面有没有东西 ===》 我删除的是不是最后一个
    res.end('{"success":"删除成功"}');   // 不需要进行迭代处理
}else{ //data  里面有东西， handler -->结果 总是 用 [] 包裹起来 find  data[0].ops
    //   我只对 data 待处理的结果集  里面的 第一组数据 进行 ID-1
    //  data=[  {ID:4},{ID:5}  ]    {ID:3},{ID:4}  --->改变  update  --》 条件，内容
      //  第二次   data =[{ID：5}]   data[0] ={ID：5,_id:dasda}]
    var selectors = [   // selectors
      {"_id":data[0]._id},  // 根据谁去修改
      {$set:   //怎样的修改
      {
        "ID":data[0].ID-1    // 具体的修改细节
      }
      }
    ];
    //console.log(fn);
    req.query.action = 'update';  // 定义 数据库操作 ---》 更新
    handler(req, res, collections, selectors,function(dat){  // 执行操作
      //  data =[{ID:4---3}(也就是说 data[0] 这个数据已经被处理好了),{ID:5}] 只是针对于 data[0]
      // 第二次  [{ID：4}]   ---> 好了
        data.shift();  // 去除  data 首项 data[0] {ID:4---3} ，已经处理完毕的数据
        //  data =[{ID：5}]
      //  二次 data []
      if(dat.length==0){
        res.end('{"err":"抱歉，更新失败"}');
      }else if(data.length!=0){  //  data =[{ID：5}]  --->
        //console.log(data);
        recUpdateID(req, res, collections,data,fn);
      }else{
        // data [],  返回更新成功 ，要么 执行传入的 回调函数fn
        if(fn){
          fn();
        }else{
          res.end('{"success":"更新成功"}');
        }

      }
    });
  }
}
//迭代删除目录绑定的视频
/*
*  dirID:目录_id
*  proID:课程_id
*  VstateName:课程名称
*  data  需要处理的视频数据集
* */
var delDirVideo = function(req, res, dirID,proID,VstateName,data,fn){
  var dirIDProName = dirID+proID ;
  if(data.length===0){
    fn();
  }else{
            req.query.action='find';
            //查询与课程ID对应的目录条数看与该课程绑定的目录是否只剩一条否则不改变videoList的Vstate字段
            handler(req, res, "directoryList", {"CDid":proID},function(set){
              //console.log(set);
              //拆分Vstate去除其中的已删除课程名
              var targetArrVstate = data[0].Vstate.split(",");
              if(set.length===1){
                var indexNumberVstate = (function(arr,val) {
                  for (var i = 0; i < arr.length; i++) {
                    if (arr[i] == val) return i;
                  }
                  return -1;
                })(targetArrVstate,VstateName);
                targetArrVstate.splice(indexNumberVstate,1);
              }
              //拆分Vmosaic去除其中的dirIDProName
              var targetArrVmosaic = data[0].Vmosaic.split(",");
              var indexNumberVmosaic = (function(arr,val) {
                for (var i = 0; i < arr.length; i++) {
                  if (arr[i] == val) return i;
                }
                return -1;
              })(targetArrVmosaic,dirIDProName);
              targetArrVmosaic.splice(indexNumberVmosaic,1);

              var selectors = [
                {"_id":data[0]._id},
                {$set:
                {
                  "Vstate":targetArrVstate.join(","),
                  "Vmosaic":targetArrVmosaic.join(",")
                }
                }

              ];
              //console.log(selectors);
              req.query.action='update';
              //更新视频列表对应数据的Vstate与Vmosaic字段
              handler(req, res, "videoList", selectors,function(da){
                data.shift();
                if(data.length==0){
                  fn();
                }else if(data.length!=0){
                  delDirVideo(req, res, dirID,proID,data,fn);

                }
              });
            });

  }
}
//迭代删除课程绑定的目录
/*
 proID 课程的_id
* */
var delProDir = function(req, res,proID,fn){
    req.query.action = 'find';
  //查询productList，获取对应ID的课程信息的_id和课程名
  handler(req, res, "productList",{_id:proID} ,function(das){
    //获取对应课程_id的目录集directoryList
    handler(req, res, "directoryList",{CDid:proID} ,function(da){
      if(da.length!==0){
        /*
         * /*
         *  dirID:目录_id
         *  proID:课程_id的拼合串
         *  VstateName:课程名称
         *  data  需要处理的视频数据集
         *
         var delDirVideo = function(req, res, dirID,proID,VstateName,data,fn){
         * */
        //获取第一个目录相关的视频集
        handler(req, res, "videoList",{ Vmosaic: { $regex: '.*'+da[0]._id+das[0]._id+'.*' } } ,function(daa){
          delDirVideo(req, res, da[0]._id,das[0]._id,das[0].Cname,daa,function(){
            //删除该目录
            req.query.action = 'delete';
            handler(req, res, "directoryList",{_id:da[0]._id} ,function(dat){
              req.query.action = 'find';
              //再次验证看该课程下是否还有目录，如果有就迭代处理
              handler(req, res, "directoryList",{CDid:proID} ,function(data){
                if(data.length===0){
                  fn();
                }else{
                  delProDir(req, res,proID,fn);
                }
              });
            });
          });

        });

      }else{
        fn();
      }
    });

  });


}
//判断对象是否为空
var isNullObj=function(obj){
  for(var i in obj){
    if(obj.hasOwnProperty(i)){
      return false;   // 检测 对象是否 为空 --》 不为空
    }
  }
  return true;    // 自身没有任何属性 ====》 空的对象
}
//生成课程代码
var generateCode = function(){
  var letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  var numbers = ['0','1','2','3','4','5','6','7','8','9'];
  var str = "";
  for(var i=0;i<8;i++){
    if(i<4){
      str+= letters.splice(parseInt(Math.random()*(letters.length)),1);
    }else{
      str+= numbers.splice(parseInt(Math.random()*(numbers.length)),1);
    }
  }
  return str;
}
// 函数 设计+调用    ---》上面只是设计，没有调用，他和没有一样

// localhost:3000/Vuehandler/aaaa?action=haha
// 前端发出的请求的地址     '/VueHandler/aaaa?action=haha'
router.get('/aaaa',function (req,res) {
  // res.send('这是我的响应')
    if(req.query.action==='haha'){  // 如果你真的是这个请求 VueHandler/aaaa?action=haha
      // req.query. 获取到get方式的 ?后面
      //  req.query.action   获取到 haha
      res.send('这是haha的接口')
    //    服务器给你一个 响应  '这是haha的接口'
    }
});

//  前端要去请求的接口是什么   请求什么数据，发挥什么功能 ---》 后台逻辑
// /VueHandler/AdminLoginAndRegHandler?action=verification

//  当前路径之下   localhost:8000/VueHandler/AdminLoginAndRegHandler--->执行里面的函数
router.get('/AdminLoginAndRegHandler',function (req,res) {
    // 门牌号码
    if(req.query.action==='verification'){  //房间号
     var randomNum=function (min,max) {     //生成随机数字   10   《10
          return Math.floor(Math.random()*(max-min)+min);
     };   // 网上 搜索一下 ： 冒泡排序
     var str='ABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789';  //从这个字符串里面随机挑选出来多个字母，当验证码
        var returnStr='';
        for(var i=0;i<4;i++){
          var txt=str[randomNum(0,str.length)];
          returnStr+=txt;
        }
    //            var returnStr='存放了随机生成的4位数字';
        //用户信息 ---》 验证码 也属于用户信息
        var newUser=new User({  //收集 用户信息里面的验证码部分
            name:'',
            password:'',
            id:"",
            veri:returnStr
        });
    //    用户信息 储存在  session里面的
    //    session   req.session 得到了我要去储存的用户信息的这个地方
        req.session.user=newUser;   // session 就有了验证码的信息了
    //    生成验证码， 因为验证码是用户登录信息的一部分，所以
    //    又将验证按储存到了 req.session.
        res.end('{"success":"true","data":"'+returnStr+'"}')
    }else if(req.query.action==='checkVerification'){
        //   前端输入的验证码  === 后台生成的验证码(已经被储存到了 req.session.user)
        // 输入不相等的验证码的时候 ---》err  证明 接口走通、验证可以基本达到效果
        //  生成验证码  ----》 才会才在 req.session.user
        // 上来直接验证  ===》 req.session.user.veri  根本不存在   ---》err
        //req.session.user 用来验证 是否有 req.session.user
        if(req.session.user&&req.query.yanzheng===req.session.user.veri){
            res.send('{"success":"验证码正确"}')
        }else {
            res.end('{"err":"验证码错误"}')
        }
    }
});

// 登录  /VueHandler/AdminLoginAndRegHandler?action=login
router.post('/AdminLoginAndRegHandler',function (req,res,next) {
	console.log(111);

    if(req.query.action=='login'){     //login  -->find  dbhandler.js 里面
        // 登录功能   加密 前端发送过来的 密码
//      var md5=crypto.createHash('md5');
//      var password=md5.update(req.body.password).digest('base64'); //123   uted8*
        let password=req.body.password;
       
       handler(req,res,'Administor',{userName:req.body.userName,password:password},function (data) {
            if(data.length===0){
                res.end('{"err":"抱歉！用户或密码无效"}')
            }else if(data.length!==0&&data[0].password===password){
            //    缺少一步  将登陆的信息 储存到session里面   没有 验证码的时候 就没有一个 name
            //       req.session.user.name=req.body.userName;
            //       req.session.user.password=req.body.password;
            //       req.session.user.id=data[0]._id;
                  // data=[{_id:123444,userName:haha}]
                // 1.找到 登录功能， 2.修改  3.触发接口  4.测试 --》 预加载外面放一个ajax，url(退出的)  get
                var newUser=new User({         // 只是为了查看退出功能 收集 用户信息里面的z账号密码部分
                    name:req.body.userName,   // 打  ----》 函数  构造函数
                    password:req.body.password,
                    id:data[0]._id
                });
                req.session.user=newUser;
                console.log(data);
                res.end('{"success":"true"}');
            //    前端 true  ===》 跳转到某一个页面
            }
        })
    }
    next()

})

// 注册的信息 很多的字段的，前端要发送到后台储存到数据库里面的信息也很多
// 这是用户信息，保密 ---》 psot
//   /VueHandler     /AdminLoginAndRegHandler   ?  action= add
// router.post('/AdminLoginAndRegHandler',function (req,res) {   //url
router.post('/AdminLoginAndRegHandler',function (req,res) {   //url

  if(req.query.action=='add'){

     req.query.action='haha';   // 查询数据库 --》 人员列表 --》arr.lenth
      handler(req,res,'Administor',null,function (arr) {  //执行数据库的操作
      //    arr 查询到的数据的结果（结果集）  handler===》 多看看？多打几遍
          var md5=crypto.createHash('md5');  // 设置加密的方式  ，md5
          var userInfor={};  // 收集 所有要添加到数据库里面的数据==>为了插入集合做准备
          userInfor.tokenId=arr.length+1; //到现在
          // tokenId  自增长  每次添加一个用户 +1
          userInfor.createAt=new Date();  //数据的创建时间
          userInfor.isdelete=/^fcgl/.test(req.body.trueName)?false:true;
      //     根据前端传过来的 trueName字段 ，判断，false, true
          userInfor.phone=/^1\d{10}$/.test(parseInt(req.body.phone))?req.body.phone:'false';
      //手机 1 10数字         使用正则表达式 匹配（ 从前端发送过来的数据：req.body）
          userInfor.power=req.body.power;  //人员的权限  --》 人员权限 系统管理人员，课程管理人员
          userInfor.powerCode=req.body.power=='系统管理人员'?1:2;
          userInfor.success='成功';
          userInfor.upDateAt=new Date();  //new Date();
          userInfor.userName=req.body.userName==''?'false':req.body.userName;
          //  看 userName 传进来的是不是空的
          // 假设前端传过来 userName3333 我将userName3333 赋值给userName
          // userInfor.userName 是用来 添加到数据库的
          userInfor.tureName=req.body.tureName==''?'false':req.body.tureName;
          /*
          *
          *   userName:'abc',
           password:'123456',
           trueName:'葫芦娃',
           phone:'12312312312',
           power:'系统管理人员'
          *
          *
          *
          *
          *
          * */

          userInfor.password=md5.update(req.body.password).digest('base64');
          // 'base64'
          // 我要添加的人员信息的 字段 到现在 就已经 组织完成了
          req.query.action='add';    //对于数据库的 操作方式了
          if(userInfor.phone!='false'&& userInfor.userName!='false'&&userInfor.trueName!='false'){
              // 正则表达式，===》 效验
              handler(req,res,'Administor',userInfor,function (data) { // 执行数据库操作
           //    data  ---> 我的结果
               if(data.length==0){
                 res.end('{"err":"失败"}')
               }else {
                 res.end('{"success":"注册成功"}')
               }
           })
          }
      })

  }
});

//  get  /VueHandler/AdminHandler?action=show
router.get('/AdminHandler',function (req,res) {
    if(req.query.action==='show'){  // 定义数据库的操作方式，只要有一个req.query.action 有了定义的操作方式，OK你就不需要再次去定义了
    //    欢迎你进入了显示接口
       handler(req,res,'Administor',null,function (arr) {
         //  查询操作     (姓名查询，分页控制)          4 条数据    第一页里面的数据  tokenID   4 3 2
       var  selector=!req.query.searchText?{tokenId:{$gt:arr.length-(parseInt(req.query.pageStart)*3-3)-3, $lte:arr.length-(parseInt(req.query.pageStart)*3-3)}}:{turename:{$regex:'.*'+req.query.searchText+'.*',$options:'i'}};
           //           搜索框是否为空   ?                        req.query.pageStart     <  tokenID <=   req.query.pageStart                                     如果搜索框里面有信息
         //如果 搜索框里面有内容   使用正则 --》 匹配 的到匹配的结果==》作为查询的条件
       console.log(selector);    // OK ---》 tokenID
       handler(req,res,'Administor',selector,function (data) {
           if(data.length==0){
               res.send('{"err":"抱歉找不到该人员"}')   //  *** must be a buffer or string
           }else {
               var obj={
                   data:{
                       pageSize:3,           //我规定的 一页能够显示几条数据
                       count:arr.length,   // 你不告诉他一共有多少条数据，让他自己去数
                       list:data            //  你请求的当前页的数据
                   }
               };
               var str=JSON.stringify(obj);
               res.send(str);             // 显示的  ---》 把得到的数据 显示在前端页面上
           }
       })
       })
    }else if(req.query.action=='delete'){    // 在添加数据的时候 --》 用户名字 不能冲突
    //    /VueHandler/AdminHandler?action=delete
    //    req.query.action=='delete'  定义了 读数据库的操作方式  是删除
handler(req,res,'Administor',{tokenId:parseInt(req.query.tokenId),isdelete:true},function (data) {
             console.log(data);
             console.log(req.query.tokenId);
             if(data.result.n==0){     //
                 res.end('{"err":"删除失败"}')
             }else {
             //    删除成功了     res.send("{'success':'成功删除'}")
             //    tokenId
             // 首先 定义操作方式  --》 查询
                 req.query.action='show';
             //    查询 tokenId > 当前删除的tokenId=（req.query.tokenId)） 的 所有数据
 handler(req,res,'Administor',{tokenId:{$gt:parseInt(req.query.tokenId)}},function (da) {
                 //     data 删除的数据
                 //    da （待处理的结果集）    tokenId > 当前删除的tokenId 的 所有数据
                 //   让 da  里面的数据 的 tokenId  -1 --> update
                     recUpdate(req,res,'Administor',da)
                 });
                 res.end('{"success":"更新成功"}')
             }
         })
    }else if(req.query.action=='quit'){   // 已经登录
        if(req.session.user){      // 确认服务器储存了登陆的用户  ---》 确认你已经登陆了
            req.session.user={};   // session 储存的就是登录的用户的信息，也就是说 退出，只要清空session就可以了
        }
        res.end('{"success":"退出成功"}')
    }else if (req.query.action==='lockuser'){
    // 冻结谁  解冻谁  ----》 学员列表，   _id()    tokenId (1-- )
        req.query.action='show';  //查询数据库方法
        handler(req,res,'studentList',{tokenId:parseInt(req.query.tokenId)},function (dat) {
            console.log(dat);
        //    修改  data --> 里面的数据 isstate --》 从true->false ||从false->true
        req.query.action='update';
        // 确定 selector [{条件},{内容}]
        var selectors=[
            {tokenId:parseInt(req.query.tokenId)},
            {$set:{
                isstate:dat[0].isstate?false:true
            }}
        ]
        //    执行操作    验证 ---》 测试页面
            handler(req,res,'studentList',selectors,function (data) {
                if(data){
                    res.end('{"success":"操作成功"}')
                }else {
                    res.end('{"err":"抱歉，冻结失败"}')
                }
            })
        })
    }else {
        res.end('{"err":"抱歉，没有这个路由"}')    // 放置浏览器 崩溃
    }
});

router.post('/AdminHandler',function (req,res) {
//    /VueHandler/AdminHandler?action=update
    if(req.query.action==='update'){   // ==>dbhandle  修改的功能
        var selector=[    //修改的数据的具体内容
            {"tokenId":parseInt(req.body.tokenId)},   // 根据谁去修改
            {$set:   // 修改的时候 修改的内容 完全是 前端传入的
                {
                    'userName':req.body.userName,  //账号
                    'turename':req.body.turename, // 姓名
                    'phone':req.body.phone,    //电话
                    'power':req.body.power,   // 权限
                    'upDateAt':new Date()      // 更新日期
                }
            }
        ];
        // 数据库的操作 将实参 传入
        handler(req,res,'Administor',selector,function (data) {
            if(data.length==0){
                res.end('{"err":"抱歉修改失败"}')
            }else {
                res.end('{"success":"更新成功"}')
            }
        })
    }else if(req.query.action=='returnuserinfo'){   //返回登陆的用户信息
    //  /VueHandler/AdminHandler?action=returnuserinfo
      console.log(req.session)   // req.session  ---》 用户信息
      req.query.action='find';
       // 从 session里面取到当前登录的用户信息
        var sessionUserName=req.session.user.name;    //就让大家 ---》知道 如何从储存的session里面拿数据
        var sessionPassword=req.session.user.password;
        var sessionId=new ObjectID(req.session.user.id);   //id 唯一性   ObjectID --> 已经引入
      handler(req,res,'Administor',{"_id":sessionId},function (data) {
      //     data
          if(data.length==0){
              res.end('{"err":"抱歉系统故障"}')
          }else {
              var str=JSON.stringify(data[0]);
              res.end(str);   //前端拿着登陆的用户信息，开心的笑了
          }
      })
    }else if(req.query.action=='updatepass'){
    //    /VueHandler/AdminHandler?action=updatepass
    // 对原来密码加密
        var md5=crypto.createHash('md5');
        var passwordMd5=md5.update(req.body.userPwd).digest('base64');
        console.log(passwordMd5);
    //    p判断 输入的密码 和登录的密码 是否一样
        if(req.session.user.password!=req.body.userPwd){
            res.end('{"err":"一边玩去！"}')
        }else {
            var md5=crypto.createHash('md5');
            var newPwd=md5.update(req.body.newPwd).digest('base64');
        // 修改数据库里面的密码
            var selector=[
                {"userName":req.session.user.name},
                //根据我当前登录的账号，修改对应的数据库里面的信息
                {$set:{
                    'password':newPwd,
                    'upDateAt':new Date()
                }}
            ];
        //    执行数据库操作
            handler(req,res,'Administor',selector,function (data) {
                if(data.length==0){
                    res.end('{"err":"密码更新失败"}')
                }else {
                    res.end('{"success":"密码更新成功"}')
                }
            })
        }
    }else if (req.query.action=='adduser'){
        //     tokenId  ---> arr.length+1
        req.query.action='find';   // 定义 数据库操作方式 查询
        handler(req,res,'studentList',null,function (arr) {
            //    组织好学员信息
            console.log(arr);
            var userInfors={};
            userInfors.tokenId=arr.length+1;
            userInfors.createAt=new Date();
            userInfors.userName=req.body.userName==""?'false':req.body.userName;
            userInfors.userPwd='123456';
            userInfors.isstate=false;   // 控制你的数据的 冻结或者正常
            userInfors.upDateAt=new Date();
            userInfors.success='成功';
            userInfors.phone=/^1\d{10}$/.test(parseInt(req.body.addphone))?req.body.addphone:'false';
            userInfors.email = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/.test(req.body.addemail)?req.body.addemail:"数据格式不对";
            //    将数据储存到 数据库的集合里面    添加 操作
            req.query.action='add'  //定义了 添加的 数据库操作类型
            console.log(userInfors)
            //    校验   phone  userName  email
            if(userInfors.phone!='false'&&userInfors.userName!='false'&&userInfors.email!='数据格式不对'){
                //    执行添加操作  --- 前提  前端发送的数据都得到了,数据的格式已经验证好了
                handler(req,res,'studentList',userInfors,function (data) {
                    if(data.length==0){
                        res.end('{"err":"学员添加失败"}')
                    }else {
                        res.end('{"success":"添加成功"}')
                    }
                })
            }else {
                res.end('{"err":"抱歉格式有误"}')
            }
        })
    }else if (req.query.action=='xxs'){    //多出来了一个集合
        req.query.action='find';   // 定义 数据库操作方式 查询
        handler(req,res,'studentMin',null,function (arr) {
            console.log(arr);
            var userInfors={};
            // 我想要填的字段 -----》 需求
            userInfors.tokenId=arr.length+1;
            userInfors.createAt=new Date();
            userInfors.userName=req.body.userName==""?'false':req.body.userName;
            userInfors.dsc=req.body.dsc;
            req.query.action='add'  //定义了 添加的 数据库操作类型
            console.log(userInfors)
                handler(req,res,'studentMin',userInfors,function (data) {
                    if(data.length==0){
                        res.end('{"err":"你连小学生都不如"}')
                    }else {
                        res.end('{"success":"你成功的创建了一个小学生"}')
                    }
                })
        })
    }
});



// 上传视频  /VueHandler/UpLoadVideoHandler
router.post('/UpLoadVideoHandler',function (req,res) {
    console.log('haha');
//    上传  ---》 模块
    var from=new formidable.IncomingForm();   // ---> 创建一个上传表单
//    配置 --》 限制
    from.encoding='utf-8';
    from.uploadDir='temporary/video/';
    //   ?  我已经设置 静态资源路径
    // 上传路径 指的就是 咱们 ---》服务器所在的路径
    from.keepExtensions= true;          // 保留文件尾缀   ***.MP4  ..avi
    from.maxFieldsSize=100*1024*1024;
    from.maxFields=1000;
    from.parse(req,function (err,fields,files) {
        console.log(fields);
        console.log('界限*********************');
        console.log(files);   // 文件信息  文件的路径
        console.log('界限*********************');
        if(!err){
            var obj={
                // path: 'temporary\\video\\upload_568a3e6a3fdafcfe5d0bc23c08c7c2c2.jpg',
                cacheName:files[Object.getOwnPropertyNames(files)[0]].path,
                //files[ 找到他自身的第一个属性  Filed]   --->path
                success:'成功'
            }
            var str=JSON.stringify(obj);
            res.end(str);
        }else {
            var obj={
                err:'你上传的视频不健康'
            }
            var str=JSON.stringify(obj);
            res.end(str);
        }
    })
})
//       /VueHandler/VideoHandler?action=add
router.post('/VideoHandler',function (req,res) {
    if(req.query.action=='add'){
        // 使用这个接口的时候，执行什么样的逻辑
        // tokenId
        req.query.action='find';
        handler(req,res,'videoList',null,function (arr) {
            var videos={};
            videos.Vname=req.body.Vname;  //视频名字
            videos.Vtime=req.body.Vtime;  //时长
            videos.Vurl=req.body.Vurl  //视频地址
            videos.ID=arr.length+1;    //相当于 tokenId
            videos.Vstate='';         // 视频被绑定
            videos.createAt=new Date();
            videos.upDateAt=new Date();
        //     以后咱们
            videos.isFinish=false;
            videos.isViewed=false;
        //    当我们信息收集完毕的时候 ----》添加
            if(videos.Vname&&videos.Vtime&&videos.Vurl){
                req.query.action='add';
                handler(req,res,'videoList',videos,function (data) {
                    if(data.lenth==0){
                        res.end('{"err":"抱歉添加失败"}')
                    }else {
                        console.log(data);
                        var obj={
                        ID:parseInt(data.ops[0].ID),
                        Vurl:data.ops[0].Vurl,
                        success:'成功'
                        };
                        var str=JSON.stringify(obj);
                        res.end(str);
                    }
                })
            }
        })
    }else if(req.query.action=='update'){
        req.query.action='find';
        handler(req,res,'videoList',{ID:parseInt(req.body.ID)},function (data) {
            console.log(data);
            if(data.length==0){
                res.end('{"err":"抱歉没有视频"}')
            }else {
            //     data 是查询到的 已经上传的视频  ，如果修改了上传视频的路径
            //    相当于  删除了之前上传的视频，再次上传了另外一个视频
                //req.body.Vurl  --->  前端发送的 视频的路径
                //data[0].Vurl  ----》 集合里面储存的对应的视频的路径
                if(data[0].Vurl!==req.body.Vurl){ //修改了上传视频的路径
                    fs.unlink(data[0].Vurl,function (err) {
                        if(err) return console.log(err)
                    })
                }
                var selector=[
                    {"ID":parseInt(req.body.ID)},
                    {"$set":{
                        Vname:req.body.Vname,
                        Vtime:req.body.Vtime,
                        Vurl:req.body.Vurl,
                        upDateAt:new Date()
                    }}
                ]
                req.query.action='update';
                handler(req,res,'videoList',selector,function (da) {
                 if(da.length==0){
                     res.end("{'err':'更新失败'}")
                 }else {
                     res.end("{'success':'更新成功！！！'}")
                 }
                })
            }
        })
    }else if(req.query.action=='showlist'){
        // 显示（分页功能 -》pageStart） + 查询（精确定位 --》searchText）  ---》 区分  selector
        // 使用的操作 都是 find 方法  ， 需要有个find 的条件
        var selector={};   //  放置查询条件的 容器
                           //如有模糊查询条件则以其为筛选器
        if(req.body.searchText){
         // req.body.searchText --》 代表着前端发送    的搜索框里面的内容
            selector.Vname={$regex:'.*'+req.body.searchText+'.*'};
        }
        //查询videoList列表获得总数据条数
        handler(req, res, "videoList", null,function(arr){
            if(isNullObj(selector)){  //如果 之前的 selector 里面没有收集到前端发送的searchText
    //selector={};  分页    手动 添加查询条件 ID  为了显示哪一页 应该显示什么数据
                selector={ID:{$gt:arr.length-(parseInt(req.body.pageStart)*3-3)-3,$lte:arr.length-(parseInt(req.body.pageStart)*3-3)}};
        //         建议 代数  -》
            }
// selector  内容已经处理完毕  （两种情况 ： I searchText II （无searchText）分页控制）
            //根据筛选器查询videoList获得结果集
            handler(req, res, "videoList",selector ,function(data){
                if(data.length==0){
                    res.end('{"err":"系统中还没有视频"}');
                }else{
                    var obj = {
                        data:{
                            pageSize:3,
                            count:arr.length,
                            list:data,
                            pageStart:req.body.pageStart
                        },
                        success:"成功"
                    }
                    var str = JSON.stringify(obj);
                    res.end(str);
                }
            });
        });

    }else{
        res.end('{"err":"抱歉，视频管理失败"}');
    }
});
router.get('/VideoHandler',function (req,res) {
    if(req.query.action=='delete'){   // 视频的删除
    //    req.query.action    but    post:  req.query    req.body
        req.query.action='find';     //  定义了数据库的操作 查询
        //根据ID查询当前视频document获得当前视频的Vurl字段
        handler(req, res, "videoList",{ID:parseInt(req.query.ID)} ,function(data){
        // 执行 查询      videoList    条件 ID：前端传过来的       ，之后呢？？
            if(data.length==0){    // 如果没有查询到数据  --》 err
                res.end('{"err":"抱歉，系统中查不到该视频"}');
            }else{    //  我根据 前端传过来 的  req.query.ID  我查询到对应的数据了
                // data[0] --->Vurl -->储存的就是 上传的视频的路径
                //删除系统中该视频文件   视频文件 储存在 --》 服务器里面
                //fs.  文件系统模块
                fs.unlink(data[0].Vurl, function (err) {  //删除这个文件
                    // 查询是为了 给删除视频 提供路径
                    if (err) return console.log(err);
                });
                // 上传到服务器里面的视频已经被删除了
                req.query.action='delete';   // 定义删除操作
                // 删除  ：  数据库中与该视频对应的数据
                // 删除 储存在数据库里面的已经被删除的视频的 数据
                handler(req, res, "videoList",{ID:parseInt(req.query.ID)},function(data){
                    if(data.result.n==0){
                        res.end('{"err":"删除失败"}');
                    }else{
                        // 数据库里面的 数据已经被删除了  ---》 迭代  tokenID
                        req.query.action = 'find';
                        //迭代处理其余视频文件的操作手柄-ID均减1
                        handler(req, res, "videoList",{ID:{$gt:parseInt(req.query.ID)}},function(da){
                            recUpdateID(req, res,"videoList",da);
                        });
                        res.end('{"success":"删除成功"}');
                    }
                });
            }
        });
    }
});

// 获取权限
// /VueHandler/CourseHandler?action=getpower
router.get('/CourseHandler',function (req,res) {
    // 登陆之后， 获取我当前账号的权限
    //  登录平台之后，  给别人开权限
    if(req.query.action=='getpower'){ // find  ---> 权限列表
        handler(req,res,'powers',null,function (data) {
            if(data.length==0){
                var obj={
                    err:"获取权限错误",
                    data:data
                };
                var str=JSON.stringify(obj);
                res.end(str);
            }else {
                var obj={
                    success:'成功',
                    data:data
                };
                var str=JSON.stringify(obj);
                res.end(str);
            }
        });
    }else if(req.query.action=='getcategory'){  // getcategory  --> find
    //    /VueHandler/CourseHandler?action=getcategory
        handler(req,res,'catalogList',null,function (data) {
            if(data.length==0){
                res.end('{"err":"恭喜！获取课程权限失败"}');
            }else {
                var obj={
                    data:data,
                    success:'权限成功'
                };
                var str=JSON.stringify(obj);
                res.end(str);
            }
        });
    }
})








module.exports = router;