
var channelName = "";
var apiKey = 'AIzaSyAOXoWi4Klu7Lw3-Acqkoovr_qkC0EoU0U';

window.onload = function(){
    document.getElementById("channelForm").onsubmit = updateChannel;  
    document.getElementById("captionForm").onsubmit = submitQuote;
}


function updateChannel(){
    //getData('http://video.google.com/timedtext?lang=en&v=QtplRk6BdyA');
    getData('http://video.google.com/timedtext?lang=en&v=Q5ysxb_nL7w'); //does nothing if no captions

    // channelName = document.getElementById("channelText").value;
    // if(channelName){
    //     alert("Channel name: " + channelName);
    // } else{
    //     alert("Channel name not set");
    // }
    return false; //this is currently necessary because submitting the form refreshes the page 
    //which messes everything up! apparently we shouldn't need a form - 
    //maybe something else would be better? 

}

function submitQuote(){
    console.log(boyerMoore("abc", "cabce"));
    console.log(boyerMoore("example", "this is an example text"));
    console.log(boyerMoore("this is part of an example", "here is a large string to illustrate that this is part of an example text"));
    console.log(boyerMoore("these strings differ by a character", "these strings.differ by a character"));
    console.log(boyerMoore("thisstringislonger", "short")); 
    console.log(boyerMoore("cat", "cat")); 
    // var quote = document.getElementById("quoteText").value;
    // if(quote){
    //     alert("Quote submitted");
    //     //do something
    // } else{
    //     alert("Please enter a quote");
    // }
    return false; //again currently necessary to not refresh page 
}

function searchQuote(){
    alert("Quote matched");
}

async function getData(url){
    try{
        const response = await fetch(url);
        if(response.ok){
            const xmlResponse = await response.text();
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
            //everything is in a <text> tag 
            let textList = xmlDoc.getElementsByTagName("text");
            let text = "";
            for(let i = 0; i < textList.length; i++){
                text += textList[i].childNodes[0].nodeValue + " ";
            }
            document.getElementById("debug").innerHTML = text; 
            //note: text will be stored along with special characters like &#39; 
            //      input text will need to keep this in mind


            
            return;
        }
        throw new Error('Request Failed!');
    }
    catch (error) {
        alert(error);
    }
}

  
//function returns true if there is a match, false if no match
function boyerMoore(pattern, text){
    const jumpTable = new Map(); 
    let distance = 1;
    for(let k = pattern.length - 2; k >= 0; k--){
        if(jumpTable.has(pattern[k]) && distance < jumpTable.get(pattern[k])){ //update distances
            jumpTable.set(pattern[k], distance);
        } else if(!jumpTable.has(pattern[k])){ //add new entry
            jumpTable.set(pattern[k], distance);
        }
        distance++;
    }
    let i = pattern.length -1; 
    let j = i;
    let last = i; //keeps track of the furthest index in the text 
    while(i <= text.length - 1){ 
        if(pattern[j] === text[i]){
            if(j === 0){ //matched the full pattern
                return true;
            } else{ //look at the rest of the elements to determine full match
                i--;
                j--;
            }
        } else{
            let incr = jumpTable.get(text[i]);
            if(!incr){ //if text[i] isnt in the pattern then it is undefined in map
                incr = pattern.length;
            }
            i = last + incr; //jump ahead as far as possible according to jump table
            j = pattern.length - 1; //reset to end for next round of comparisons
            last = i; //update position of the last pointer 
        }
    }
    return false;
}


  /*

  PART 1: 

  store channelName
  `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelName}&type=channel&fields=items%2Fsnippet%2FchannelId&key=${apiKey}` 
  store channelId

  PART 2:
  `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${apiKey}&part=contentDetails`
  store playlistId
  create pageToken = "" 

  PART 3:
  `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails${pageToken}&playlistId=${playlistId}&key=${apiKey}`
  store nextPageToken
  store all videoId's
  pageToken = `&pageToken=${nextPageToken}`
  presumably nextPageToken is truthy when there is more, call again until it is not 

  PART 4:
  call getData for each videoId with 
  `http://video.google.com/timedtext?lang=en&v=${videoId[i]}`
  store captions 

  PART 5:
  perform pattern matching? algorithm 

  PART 6:
  once matches are found, get videoName
  `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`


  */


 


