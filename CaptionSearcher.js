/*
Copyright 2020, Isaiah Grief, All rights reserved.

This program uses the Youtube Data API to gather data about Youtube channels and videos.
Users input a channel name and then enter a quote from a video on that channel,
this program will return a list of video titles and links for which the closed captioning contained
the user's inputted quote. 
*/

var videoIdToDetails = new Map(); //name, blurb, time, captions[]
var channelDetails; //id, name, thumbnail, subscribers, videos
var counter = 0;

window.onload = function(){
    document.getElementById("channelForm").onsubmit = updateChannel;
    document.getElementById("captionForm").onsubmit = submitQuote;
}

function appendChannelChoice(channelDetailsChoice){
    var channelDiv = document.getElementById("channelInfo");

    var channelElement = document.createElement("div");
    channelElement.className = "channelElem";

    var id = channelDetailsChoice.id;
    var channelName = channelDetailsChoice.name;
    var thumbnail = `<img src="${channelDetailsChoice.thumbnail}"/>`
    var subscriberCount = `Subscribers: ${channelDetailsChoice.subscribers}`;
    var videoCount = `Videos: ${channelDetailsChoice.videos}`;


    var button = document.createElement("button");
    button.innerHTML = thumbnail;
    button.addEventListener("click", chooseChannel);
    channelElement.appendChild(button);

    createAndAppendElement("p", channelName, channelElement);
    createAndAppendElement("p", subscriberCount, channelElement);
    createAndAppendElement("p", videoCount, channelElement);
    channelElement.id = id;

    channelDiv.appendChild(channelElement);
}

function createAndAppendElement(type, inner, appendTo){
    var elem = document.createElement(type);
    elem.innerHTML = inner;
    appendTo.appendChild(elem);
}

function chooseChannel(){
    var channelDiv = document.getElementById("channelInfo");
    var channelElement = this.parentElement;
    var childNodes = channelElement.childNodes;

    channelDetails = {
        channelId: channelElement.id,
        channelName: childNodes[1].innerHTML,
        thumbnail: childNodes[0].innerHTML,
        subscriberCount: childNodes[2].innerHTML,
        videoCount: childNodes[3].innerHTML
    };
    
    channelDiv.innerHTML = "";
    createAndAppendElement("p", channelDetails.channelId, channelDiv);
}

function updateChannel(){
    var channelName = document.getElementById("channelText").value;
    if(channelName){
        console.log("Channel name: " + channelName);
        getAndAppendChannels(channelName);
    } else{
        alert("Channel name not set");
    }
    
    return false; //don't submit, don't refresh page
}


async function getAndAppendChannels(channelName){
    if(!channelName){
        console.log(`Channel name invalid`);
        return;
    }
    console.log(`Attempting to fetch channel ID...`);
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelName}&type=channel&fields=items%2Fsnippet(channelId%2Ctitle%2Cthumbnails%2Fdefault%2Furl)&key=${apiKey}`);

    try{
        //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        if(jsonResponse.items.length <= 0){
            alert("No channels found");
            return;
        } else{
            //we can change this to allow users to select from the list of channels
            for(let i = 0; i < jsonResponse.items.length; i++){
                console.log(JSON.stringify(jsonResponse));
                let channel = {
                    id: jsonResponse.items[i].snippet.channelId,
                    name: jsonResponse.items[i].snippet.title,
                    thumbnail: jsonResponse.items[i].snippet.thumbnails.default.url,
                    subscribers: null,
                    videos: null
                };
                await getChannelStatistics(channel, channel.id);
                appendChannelChoice(channel);
            }
            //channelId = jsonResponse.items[0].snippet.channelId;
            //console.log(`Channel ID = ${channelId}`);
            //getPlaylistId(); //now fetch everything else 
        }
        //if it is not valid (no channels), then it returns {"items":[]}
    }
    catch (error) {
        alert(error);
    }
}

async function getChannelStatistics(channel, channelId){
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&fields=items%2Fstatistics(subscriberCount%2CvideoCount)&key=${apiKey}`);
    try{
        if(jsonResponse.items.length <= 0){
            alert("No channels found");
            return;
        } else{
            console.log(JSON.stringify(jsonResponse));
            channel.subscribers = jsonResponse.items[0].statistics.subscriberCount,
            channel.videos = jsonResponse.items[0].statistics.videoCount
        }
    }
    catch (error) {
        alert(error);
    }
}

function submitQuote(){
    if(!channelId){
        alert("Must enter a channel name first.");
        return;
    }
    var quote = document.getElementById("quoteText").value;
    if(quote){
        document.getElementById("resultsList").innerHTML = "Processing results..."; //clear all nodes to make room for new query
        document.getElementById("captionInputText").innerHTML = quote;
        quote = quote.toLowerCase();
        var videoIds = Array.from(videoIdToDetails.keys());
        console.log(`Attempting to pattern match ${quote}...`);
        var matchMap = new Map();
        videoIds.forEach(id => {
            matchMap.set(id, boyerMoore(quote, videoIdToDetails.get(id).captions, id));
        })
        console.log(`Done pattern matching`);
        var matches = Array.from(matchMap.keys());
        matches = matches.filter(id => matchMap.get(id)); //all the videoIds that returned TRUE
        console.log(matches);
        //document.getElementById("debug").innerHTML = matches;
        document.getElementById("resultsList").innerHTML = ""; //clear feedback string 
        findAndPostVideoDetails(matches);

    } else{
        alert("Please enter a quote");
    }
    return false; //again currently necessary to not refresh page 
}

async function findAndPostVideoDetails(matches){
    const storeName = async videoId => {
        return new Promise(resolve => {
            var name = getVideoName(videoId);
            resolve(name);
        }).then(name => {
            videoIdToDetails.get(videoId).name = name;
            return videoId;
        });
    }

    var matchFunctions = matches.map(storeName);
    var results = Promise.all(matchFunctions);
    results.then(videoIds => {
        console.log(videoIds);
        videoIds.forEach(videoId => {
            console.log(`Adding link to video ${videoId}`);
            var term = document.createElement("dt");
            term.appendChild(document.createTextNode(videoIdToDetails.get(videoId).name));
            console.log(`The name for ${videoId} is ${videoIdToDetails.get(videoId).name}`)
            document.getElementById("resultsList").appendChild(term);

            var blurb = videoIdToDetails.get(videoId).blurb;
            createAndAppendElement("dd", blurb, document.getElementById("resultsList"));

            var time = obj.time;
            //var link = `https://youtube.com/watch?v=${videoId}`;
            //var link = `https://youtu.be/${videoId}?t=${time}`;
            var link = `https://www.youtube.com/embed/${videoId}`;
            var embed = `<iframe width="560" height="315" src="${link}?start=${time}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            captionResult.insertAdjacentHTML('beforebegin', embed);

        })
    });
}

async function fetchJSONResponse(url){
    try{
        const response = await fetch(url);
        console.log(`Done waiting for response`);
        if(response.ok){
            let jsonResponse = await response.json();
            return jsonResponse;
        } else{
            let jsonResponse = await response.json(); 
            document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
            throw new Error('Request Failed!');
        }
    }
    catch (error) {
        alert(error);
    }
}

async function fetchXMLResponse(url){    
    try{
        const response = await fetch(url);
        console.log(`Done waiting for response`);
        if(response.ok){
            const xmlResponse = await response.text();
            let parser = new DOMParser();
            return parser.parseFromString(xmlResponse, "text/xml");
        }
        throw new Error('Request Failed!');
    }
    catch (error) {
        alert(error);
    }
}

async function getVideoName(videoId){
    if(!videoId){
        console.log(`Video ID invalid`);
        return;
    } else if(videoIdToDetails.get(videoId).name){
        console.log(`Video name already found`);
        return videoIdToDetails.get(videoId).name;
    }
    console.log(`Attempting to fetch video details...`);
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&fields=items%2Fsnippet%2Ftitle&key=${apiKey}`);
    try{
        //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        //console.log(JSON.stringify(jsonResponse));
        if(jsonResponse.items.length > 0){
            console.log(jsonResponse.items[0].snippet.title);
            return jsonResponse.items[0].snippet.title;
        }
        return jsonResponse.title;
    }
    catch (error) {
        alert(error);
    }
}


//this function will grab playlist id
async function getPlaylistId(){
    if(!channelId){
        console.log(`Invalid channel ID`);
        return;
    }
    console.log(`Attempting to fetch playlistId of uploads...`);
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&fields=items%2FcontentDetails%2FrelatedPlaylists%2Fuploads&key=${apiKey}`);
    try{ //store the playlistId full of uploads
        document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        if(jsonResponse.items.length <= 0){
            alert("No playlists found");
            return;
        } else{
            var playlistId = jsonResponse.items[0].contentDetails.relatedPlaylists.uploads;
            console.log(`Playlist ID = ${playlistId}`);
            getVideoIdsAndInitializeMap(playlistId);
        }
    }
    catch (error) {
        alert(error);
    }
}

//get all videoIds 
async function getVideoIdsAndInitializeMap(playlistId) {
    var pageToken = "";
    console.log(`Attempting to fetch videoIds of uploads...`);
    while(true){ //we will break out once we have all the videos - need loop for pageTokens
        console.log(`Iterating for page token =${pageToken}`);
        const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50${pageToken}&playlistId=${playlistId}&key=${apiKey}`);
        try{ //store all videoIds (put it in the map, map it to "");
            if(jsonResponse.items.length <= 0){
                break;
            } else{ //store videoIds and initialize the map
                jsonResponse.items.forEach(element => videoIdToDetails.set(element.contentDetails.videoId, {
                    name: null,
                    blurb: null,
                    time: null,
                    captions: []
                }));
                
                //get next page token
                var nextPageToken = jsonResponse.nextPageToken;
                console.log(`next page token = ${nextPageToken}`);
                if(nextPageToken){
                    pageToken = `&pageToken=${nextPageToken}`;
                } else{
                    break;
                }
            }
        }
        catch (error) {
            alert(error);
        }
    } //end of getting videoIds

    getCaptions();
}
    
//grab all captions for every video in the stored channel
async function getCaptions(){
    var videoIds = Array.from(videoIdToDetails.keys());
    console.log(videoIds);
    console.log(`Attempting to fetch captions for each videoId asynchronously...`);
    //get captions
    var asyncCaptionFx = videoIds.map(elem => async () => {
        //get the caption and put it in the map
        console.log(`creating async function for ${elem}`);
        var captions = await getCaptionFromURL(`http://video.google.com/timedtext?lang=en&v=${elem}`);
        videoIdToDetails.get(videoId).captions = captions;
    });
    var asyncCaptionFx = asyncCaptionFx.map(fx => fx()); //start the functions

    await Promise.all(asyncCaptionFx); //wait for all promises to be fulfilled
    console.log(`Done fetching all captions`);
}

//returns captions as an array of captionObjects
async function getCaptionFromURL(url){
    console.log(`Attempting to fetch captions at ${url}...`);
    try{
        const xmlDoc = await fetchXMLResponse(url);
        //everything is in a <text> tag 
        let textList = xmlDoc.getElementsByTagName("text");
        let text = [];
        
        let cumulativeMatchIndex = -1;
        for(let i = 0; i < textList.length; i++){
            let caption = htmlDecode(textList[i].childNodes[0].nodeValue + " ");
            let captionAlphaNumeric = toAlphaNumeric(caption);
            cumulativeMatchIndex += captionAlphaNumeric.length;
            let startTime = textList[i].getAttribute('start');
            text.push({caption: caption,
                        captionAlphaNumeric: captionAlphaNumeric,
                         startTime: startTime,
                         lastMatchIndex: cumulativeMatchIndex});
        }
        console.log(text);
        return text
    }
    catch (error) {
        alert(error);
    }
}
  
function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

function toAlphaNumeric(str){
    return str.toLowerCase().replace(/[\n\r]+/g, " ").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g," ").trim() + " ";
}


//function returns true if there is a match, false if no match
function boyerMoore(pattern, captionObjects, videoId){
    console.log(`Attempting to discover match for pattern ${pattern}`);
    const jumpTable = new Map(); 
    const alphaNumericPattern = toAlphaNumeric(pattern);

    updateJumpTable(jumpTable, alphaNumericPattern);

    let text = "";
    captionObjects.forEach(element => text += element.captionAlphaNumeric);

    let textIdx = alphaNumericPattern.length -1; 
    let patternIdx = textIdx;
    let firstTextIdx = 0;
    let lastTextIdx = textIdx; //keeps track of the furthest index in the text 

    let range = [0, 0];
    updateRange(range, captionObjects, firstTextIdx, lastTextIdx);

    while(textIdx <= text.length - 1){ 
        if(alphaNumericPattern[patternIdx] === text[textIdx]){
            if(patternIdx === 0){ //matched the full pattern
                console.log(`Match found!`);
                var margin = 1;
                var blurbText = "";
                var leftIdx = range[0] - margin >= 0 ? range[0] - margin : 0;
                var rightIdx = range[1] + margin < captionObjects.length ? range[1] + margin : captionObjects.length - 1;

                for(let blurbIdx = leftIdx; blurbIdx <= rightIdx; blurbIdx++){
                    let captionSegment = captionObjects[blurbIdx].caption; 
                    blurbText += captionSegment + " ";
                }

                var time = Math.trunc(captionObjects[range[0]].startTime); 

                Object.assign(videoIdToDetails.get(videoId), {blurb: blurbText, time: time});

                return true;
            } else{ //look at the rest of the elements to determine full match
                textIdx--;
                patternIdx--;
            }
        } else{
            let incr = jumpTable.get(text[textIdx]);
            if(!incr){ //if text[i] isnt in the pattern then it is undefined in map
                incr = alphaNumericPattern.length;
            }

            firstTextIdx += incr;
            lastTextIdx += incr;
            textIdx = lastTextIdx;
            patternIdx = alphaNumericPattern.length - 1; //reset to end for next round of comparisons
            updateRange(range, captionObjects, firstTextIdx, lastTextIdx);
        }
    }
    console.log(`No match found.`);
    return false;
}

function updateJumpTable(jumpTable, pattern){
    let distance = 1;
    for(let k = pattern.length - 2; k >= 0; k--){
        if(jumpTable.has(pattern[k]) && distance < jumpTable.get(pattern[k])){ //update distances
            jumpTable.set(pattern[k], distance);
        } else if(!jumpTable.has(pattern[k])){ //add new entry
            jumpTable.set(pattern[k], distance);
        }
        distance++;
    }
}

function updateRange(range, captionObjects, firstTextIdx, lastTextIdx){
     for(let captionIdx = range[1]; captionIdx < captionObjects.length; captionIdx++){
        if(lastTextIdx <= captionObjects[captionIdx].lastMatchIndex){
            range[1] = captionIdx;
            break;
        }
    }
    for(let captionIdx = range[0]; captionIdx < captionObjects.length; captionIdx++){
        if(firstTextIdx <= captionObjects[captionIdx].lastMatchIndex){
            range[0] = captionIdx;
            break;
        }
    }
}