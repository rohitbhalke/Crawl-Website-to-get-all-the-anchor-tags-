var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var json2csv = require('json2csv');


/* GET home page. */
router.get('/', function (req, res, next) {

    var limit, iteration = 1, visitedUrls = [];

    limit = process.argv[2] ? parseInt(process.argv[2].split("=")[1]) : 2;

    console.log("Starting Scrapping with limit : ", limit);
    var originalURL = 'https://medium.com/', result = [];

    request(originalURL, function (err, response, html) {
        var $ = cheerio.load(html);
        var anchorTagsObjArray = $('a'), anchorTags = [];

        [].forEach.call(anchorTagsObjArray, function (url) {
            anchorTags.push(url.attribs.href);
        });

        var filteredTags = uniqueTags(anchorTags);

        // Remove this visited URL
        filteredTags.splice(filteredTags.indexOf(originalURL, 1));

        result.push(originalURL);
        visitedUrls.push(originalURL);

        var q = async.queue(function (urlToVisit, callback) {
            if (visitedUrls.indexOf(urlToVisit) == -1) {
                visitedUrls.push(urlToVisit);
                request(urlToVisit, function (err, response, html) {
                    if (html) {
                        var $ = cheerio.load(html);
                        var anchorTagsObjArray = $('a'), anchorTags = [];
                        [].forEach.call(anchorTagsObjArray, function (url) {
                            anchorTags.push(url.attribs.href);
                        });
                        // Till this time we got all the anchor tags, from current page

                        var filteredTags = uniqueTags(anchorTags);

                        console.log(urlToVisit);
                        // filter these tags, as one page can contain multiple duplicate tags

                        filteredTags.splice(filteredTags.indexOf(urlToVisit, 1));
                        result.push(originalURL);
                        [].push.apply(result, filteredTags);

                    }
                    callback();
                });
            }
            else {
                callback();
            }
        }, 5);         // setting parallel limit to 5

        // push into the queue
        function pushIntoQueue(filteredTags) {
            var mediumSiteTags = removeUnnecessaryTags(filteredTags);
            for (var i = 0; i < mediumSiteTags.length; i++) {
                q.push(mediumSiteTags[i]);
            }
        };

        pushIntoQueue(filteredTags);        // Push in queue
        iteration++;

        q.drain = function () {
            console.log("**************** Drain **************");
            if (iteration < limit) {
                iteration++;
                pushIntoQueue(result);
            }
            else
                writeFile(result, res);
        };

    });

});


var writeFile = function (result, res) {
    var filtererResult = result.filter(function (url) {
        return result.indexOf(url) === result.lastIndexOf(url);
    });
    var json = convertToJson(filtererResult);
    var csv = json2csv({data: json, fields: ['url']});
    fs.writeFile('file.csv', csv, function (err) {
        if (err) throw err;
        console.log('file saved');
        res.render('index', {title: "CSV Report Generated"});
    });
};

var convertToJson = function (arr) {
    var objArr = [];
    arr.forEach(function (index) {
        objArr.push(
            {
                'url': index
            }
        )
    });
    return objArr;
};


var removeUnnecessaryTags = function (arrayOfTags) {
    // The purpose is to filter out only those urls which belongs to medium.com
    var mediumSiteTags = arrayOfTags.filter(function (tagUrl) {
        return tagUrl.indexOf('https://medium.com/') === 0 || tagUrl === 'https://jobs.medium.com' || tagUrl === 'https://legal.medium.com';
    });
    return uniqueTags(mediumSiteTags);
};

var uniqueTags = function (arrayOfTags) {
    // The purpose is to get unique tags from array
    var unique = arrayOfTags.filter(function (tagUrl) {
        return arrayOfTags.indexOf(tagUrl) === arrayOfTags.lastIndexOf(tagUrl);
    });
    return unique;
};

module.exports = router;
