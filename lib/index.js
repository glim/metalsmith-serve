'use strict';

var serveStatic = require('serve-static');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var extend = require('extend');


var serve = function(options) {
  var server;

  var f = function(files, metalsmith, done) {

    if (server) {
      done();
      return;
    }

    var docRoot = metalsmith.destination();
    var fileServer = serveStatic(docRoot, {
        maxAge: options.cache,
        index: options.indexFile,
        redirect: options.redirect,
        extensions: options.extensions
      });

    server = require('http').createServer(function (request, response) {
      request.addListener('end', function () {

        fileServer(request, response, function(err, res) {
          if (err) {
            log(chalk.red("[" + err.status + "] " + request.url), true);

            response.writeHead(err.status, err.headers);
            response.end("Not found");

          } else if (res == undefined) {
            fs.readFile(path.join(docRoot,request.url+'.'+options.extensions[0]),function(err,contents){
              if (err) {
                var send404 = function (response,message) {
                  message = message || "<!doctype html><html><head></head><body><h1>Not Found</h1></body></html>";
                  response.writeHead(404,{'Content-Type': 'text/html'});
                  response.write(message);
                  response.end();
                };
                if (options.redirect404) {
                  fs.readFile(path.join(docRoot,options.redirect404),function(err,content) {
                    send404(response,content);
                  });              
                }
                else {
                  send404(response);
                }
              }
              else {
                response.writeHead(200,{'Content-Type': 'text/html'});
                response.write(contents);
                response.end();                
              }
            })
          } else if (options.verbose) {
            log("[" + response.statusCode + "] " + request.url, true);
          }
        });

      }).resume();

    })

    server.on('error', function (err) {
      if (err.code == 'EADDRINUSE') {
        log(chalk.red("Address " + options.host + ":" + options.port + " already in use"));
        throw err;
      }
    });

    server.listen(options.port, options.host);

    log(chalk.green("serving " + docRoot + " at http://" + options.host + ":" + options.port));
    done();

  }

  f.shutdown = function(done) {
    server.close(function() {
      done();
    });
  }

  return f;
}


function formatNumber(num) {
  return num < 10 ? "0" + num : num;
}

function log(message, timestamp) {
  var tag = chalk.blue("[metalsmith-serve]");
  var date = new Date();
  var tstamp = formatNumber(date.getHours()) + ":" + formatNumber(date.getMinutes()) + ":" + formatNumber(date.getSeconds());
  console.log(tag + (timestamp ? " " + tstamp : "") + " " + message);
}


var defaults = {
  cache: 0,
  port: 8080,
  host: "localhost",
  verbose: false,
  listDirectories: false,
  indexFile: "index.html",
  redirect: true,
  extensions: ['html']
};

var plugin = function (options) {
  var params = extend({}, defaults, options);
  return serve(params);
}

module.exports = plugin;
