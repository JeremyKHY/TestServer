var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var index = require('./routes/index');
var users = require('./routes/users');
var app = express();
var http = require("http");
var io = require("socket.io")({transports: ['websocket'],});
io.attach(3030);
var redis = require('redis');
var client = redis.createClient(6379,'testfg-001.sychtz.0001.apn2.cache.amazonaws.com');
var date = require('date-utils');
var schedule = require('node-schedule');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);
app.use('/users', users);

//채팅서버@@@@
io.on('connection', function(socket){
  console.log("connection@@@");
  socket.on('join', function(data){
    console.log(data.user + ' : ' + data.roomname);
    socket.leave(socket.room);
    socket.join(data.roomname);
    socket.room = data.roomname;
  });
  socket.on('chat', function (data){
    console.log(data.user + ' : ' + data.msg + ' : ' + data.date);
    io.sockets.emit('chat', data);
  });
  socket.on('group', function (data){
    console.log(data.user + ' : ' + data.msg + ' : ' + data.date);
    io.to(data.roomname).emit('group', data);
  });
  socket.on('userjoin', function(data){
    console.log("userjoin");
    socket.leave(socket.room);
    socket.join(data.roomname);
    socket.room = data.roomname;
    socket.broadcast.to(data.roomname).emit('overlap', data);
  })
  // socket.on('overlap', function (data){
  //   console.log("overlap");
  //   io.to(data.roomname).emit('overlap', data);
  // })

  socket.on('disconnect', function(){
  });
});

//시즌시간 
var rule = new schedule.RecurrenceRule();
rule.second = 10;
var test = 0;
var j = schedule.scheduleJob(rule,function(){

  test++;
  console.log('test : ' + test);
  if(test == 5)
  {
    j.cancel();
  }
});

var SeasonCount = 1;
var count = 259200;
var repeat = setInterval(function(){
  //console.log('setInterval : ' + count);
  count--;
  if(count == 0)
  {
    count = 259200;
    SeasonCount++;
   // clearInterval(repeat);
  }
},1000);

app.post('/getSeasonInfo', function(req,res)
{
  var row = {"count" : SeasonCount, "time" : count};
  res.json(row);  
});

//전투력 데이터 저장
app.post('/setUserFightingPower', function(req,res)
{
 client.select(0, function(err)
 {
    client.zadd("FightingPower",req.body.score,req.body.userid, function(err,data)
    {
      if(err)
      {
       // var temp = err;
       // res.json(temp);
      }
      else
      {
        var temp = "success!";
        res.json(temp);
      }
    });
 });
});
//시즌 초기화
app.post('MoveTest', function(req,res)
{
  client.move("FightingPower", "3", function(err, succeed)
  {
    console.log("Tes01");
    console.log(succeed);
      if(err)
      {
          console.log("Tes02");
      }
      else
      {
          console.log("Tes03");
      }
  });
});
//전투력 데이터 받아오기
app.post('/getUserFightingPowerList', function(req,res)
{
 var arg = ["FightingPower",req.body.maxscore,req.body.minscore,"WITHSCORES","LIMIT",req.body.offset,req.body.usercount];
 client.zrevrangebyscore(arg, function(err,data)
 {
   if(err)
   {
     
   }
   else
   {
     var temp = data;
     res.json(temp);
   }
 });
});

//콜로세움 랭킹 데이터 저장
app.post('/setRank', function(req,res)
{
 var arg = ["Ranking",req.body.score,req.body.userid];
 client.zadd(arg, function(err)
 {
   if(err)
   {
     var temp = err;
     res.json(temp);
   }
   else
   {
     var temp = "success!";
     res.json(temp);
   }
 });
});

//콜로세움 나의 랭킹 받아오기
app.post('/getMyRank', function(req,res)
{
 client.zrevrank("Ranking",req.body.userid, function(err, data)
 {
   console.log(data+1);
   if(err)
   {
     var temp = err;
     res.json(temp);
   }
   else
   {
     var temp = data+1;
     res.json(temp);
   }
 });  
});

//콜로세움 랭킹 리스트 받아오기
app.post('/getRankList', function(req,res)
{
 var arg = ["Ranking",req.body.minRank,req.body.maxRank,'WITHSCORES'];
 client.zrevrange(arg, data);
     function data(err, range)
     {
       if(err) return;
       var list = [], l = range.length;

       for(var i = 0; i < l; i += 2)
       {
         console.log(range[i]);
       }
       res.json(list);
     }
    // console.log(temp);
     
    // res.json(temp);
});

//서버 시간 받아오기
app.post('/getTime', function(req,res)
{
 var newDate = new Date();
 var time = newDate.toFormat('YYYYMMDD HH24MISS');
 res.json(time);
});

//앱 플랫폼 버전 받아오기
app.post('/getAppVersion', function(req,res)
{
 client.select(1, function(err1)
 {
   client.hget("AppVer",req.body.platform, function(err2,data)
   {
     if(err2)
     {
       var temp = err2;
       res.json(temp);  
     }
     else
     {
       var temp = data;
       res.json(temp);
     }
   });
 });
});

//사용자 차단 등록
app.post('/setUserBanList', function(req,res)
{
	client.select(1, function(err1)
	{
		client.hset("User_BanList",req.body.userid,req.body.value, function(err)
		{
			if(err)
			{
        var tmep = err;
				res.json(temp);
			}
			else
			{
				var temp = "success!";
				res.json(temp);
			}
		});
	});
});

//사용자 차단 체크
app.post('/existsUserBanList', function(req,res)
{
	client.select(1, function(err1)
	{
		client.hexists("User_BanList",req.body.userid, function(err,data)
		{
			if(err)
			{
				var temp = err;
				res.json(temp);
			}
			else
			{
				res.json(data);
			}
		});
	});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
 var err = new Error('Not Found');
 err.status = 404;
 next(err);
});

// error handler
app.use(function(err, req, res, next) {
 // set locals, only providing error in development
 res.locals.message = err.message;
 res.locals.error = req.app.get('env') === 'development' ? err : {};

 // render the error page
 res.status(err.status || 500);
 res.render('error');
});

module.exports = app;
