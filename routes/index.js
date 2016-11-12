var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var json2csv = require('json2csv');

/* GET home page. */
router.get('/', function(req, res, next) {

  var originalURL = 'https://medium.com/', result=[];

  request(originalURL, function(err, response, html){
      var $ = cheerio.load(html);
      var anchorTagsObjArray = $('a'), anchorTags=[];

      [].forEach.call(anchorTagsObjArray, function(url){
          anchorTags.push(url.attribs.href);
      });

      var filteredTags = anchorTags.filter(function(url){
          return anchorTags.indexOf(url)===anchorTags.lastIndexOf(url);
      });

      // Remove this visited URL
      filteredTags.splice(filteredTags.indexOf(originalURL,1));

      result.push(originalURL);

      var q = async.queue(function(urlToVisit, callback){
          request(urlToVisit, function(err, response, html) {
              if(html){
                  var $ = cheerio.load(html);
                  var anchorTagsObjArray = $('a'), anchorTags = [];
                  [].forEach.call(anchorTagsObjArray, function (url) {
                      anchorTags.push(url.attribs.href);
                  });
                  // Till this time we got all the anchor tags, from current page

                  var filteredTags = anchorTags.filter(function (url) {
                      return anchorTags.indexOf(url) === anchorTags.lastIndexOf(url);
                  });

                  // filter these tags, as one page can contain multiple duplicate tags

                  filteredTags.splice(filteredTags.indexOf(urlToVisit, 1));
                  result.push(originalURL);
                  [].push.apply(result, filteredTags);

              }
              callback();
          });
      },5);         // setting parallel limit to 5

      // push into the queue
      for(var i=0;i<filteredTags.length;i++){
          q.push(filteredTags[i]);
      }


      q.drain = function() {
          writeFile(result, res);
      };

  });

});


var writeFile = function(result, res) {
    console.log("END");
    var filtererResult = result.filter(function(url){
        return result.indexOf(url) === result.lastIndexOf(url);
    });
    var json = convertToJson(filtererResult);
    var csv = json2csv({ data: json, fields: ['url'] });
    fs.writeFile('file.csv', csv, function(err) {
        if (err) throw err;
        console.log('file saved');
        res.render('index',{title : "CSV Report Generated"});
    });
};

var convertToJson = function(arr){
    var objArr = [];
    arr.forEach(function(index){
        objArr.push(
            {
                'url' : index
            }
        )
    });
    return objArr;
};


module.exports = router;
