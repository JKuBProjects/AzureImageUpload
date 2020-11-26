const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");

const app = express();

// It just reads the index.html file and sends the same as response. This path will directly open index.html in browser
app.get("/", function (req, res, next) {
    res.sendFile(__dirname + '/index.html');
});

// To parse json request body
app.use(bodyParser.json());
// To parse url encoded request parameters/body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
// CORS Filter
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    next();
});


var sizeInKB = 15;
var fileStats = fs.statSync(__dirname +'/images/FinalImage.jpg');
var fileSizeInBytes = fileStats["size"];
console.log("fileSizeInBytes: ", fileSizeInBytes);
// var fileSizeInKilobytes = fileSizeInBytes / 1024.0
// var packetnum = Math.ceil(fileSizeInKilobytes/sizeInKB);

var data = [];
const sampleDirectoryPath = path.join(__dirname, '/images/FinalImage.jpg');
// console.log("Image file path: ", sampleDirectoryPath);
var readStream = fs.createReadStream(
    sampleDirectoryPath,
    {
        highWaterMark: sizeInKB * 1024,
        encoding:'binary',
        autoClose: true,
        emitClose: true
    });
var i = 0;
readStream.on('data', function (chunk) {
    data.push(chunk);
}).on('end', function () {
    // console.log("Sending Data: ", data);
    // console.log("End Event Emitted");
    // console.log(Object.keys(data[0]).length);
    const intervalObj = setInterval(() => {
        var blockID = "";
        var bytesRange = "";
        var fileName = "azure_binary_upload_test_nodejs";
        if (i == 0) {
            blockID = "MDAwNA==";
            bytesRange = `0-${(Object.keys(data[i]).length) - 1}`;
        } else if (i == 1) {
            blockID = "MDAwMw==";
            bytesRange = `${Object.keys(data[i-1]).length}-${Object.keys(data[i-1]).length + Object.keys(data[i]).length}`;
        }
        
        sendChunkedImageData(data[i], blockID, bytesRange, fileName);
        i++;
        if (i == data.length) {
            // console.log("Complete Message Sent");
            clearInterval(intervalObj);
        }
    }, 5000);
}).on('close', function () {
    // console.log("Close Event Emitted...");
});

// Testing
app.get('/test', (req, res) => {
    res.send("Demo Chunk Application Running Successfully...");
});


mergeChunkedImageData = (data, fileName) => {
    // console.log("Inside mergeChunkedImageData Function...");
    // console.log("mergeChunkedImageData request body: ", data);
    var parameterString = "comp=blocklist";   // You can add more parameters if you want
    const options = {
        hostname: <your_host_name_in_string>,
        //   port: 10321,
        path: `/test/${fileName}?${parameterString}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/xml',
            'Content-Length': data.length
        }
    }

    // console.log("Sending Data: ", data);
    // HTTPS request
    const req = https.request(options, res => {
        console.log(`mergeImage statusCode: ${res.statusCode}`);

        res.on('data', d => {
            console.log("Inside request sent and response received in mergeImage: ", d);
            process.stdout.write(d);
        })
        .on('end', endData => {
            // console.log("Inside mergeImage res end...");
        });
    });
    console.log("Request Sent for mergeImage: ", req.getHeaders());

    req.on('error', error => {
        console.error("mergeImage Error received: ", error);
    });

    req.write(data);
    req.end();
}


sendChunkedImageData = (data, blockID, bytesRange, fileName) => {
    // console.log("Inside sendChunkedImageData Function...");
    console.log("blockID: ", blockID);
    var parameterString = `comp=block&blockId=${blockID}`;   // You can add more parameters if you want
    const options = {
        hostname: <your_host_name_in_string>,
        //   port: 10321,
        path: `/test/${fileName}?${parameterString}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'image/jpeg',
            // 'Content-Type': 'application/octet-stream',
            'Content-Length': data.length,
            'x-ms-date': 'Tue, 22 Nov 2020 13:30:35 GMT',
            'x-ms-version': '2019-12-12',
            'x-ms-meta-m1': 'v1',
            'x-ms-meta-m2': 'v2',
            'x-ms-blob-type': 'BlockBlob',
            // 'x-ms-source-range': 'bytes='+bytesRange
        }
    }
    // console.log("Sending Data: ", data);
    // HTTPS request
    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', d => {
            console.log("Inside request sent and response received: ", d);
            process.stdout.write(d);
        })
        .on('end', endData => {
            console.log("Inside res end...");
            if (blockID === 'MDAwMw==') {
                var bodyString = "";
                bodyString = `<?xml version="1.0" encoding="utf-8" ?><BlockList><Latest>MDAwNA==</Latest><Latest>MDAwMw==</Latest></BlockList>`;
                mergeChunkedImageData(bodyString, fileName);
            }
        });
    });

    console.log("Request Sent: ", req.getHeaders());

    req.on('error', error => {
        console.error("Error received: ", error);
    });

    req.write(data);
    req.end();
}

module.exports = app;
