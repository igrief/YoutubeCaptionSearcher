
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
    var quote = document.getElementById("quoteText").value;
    if(quote){
        alert("Quote submitted");
        //do something
    } else{
        alert("Please enter a quote");
    }
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