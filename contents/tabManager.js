//找路用代碼
console.log("X");

var tabmg; //jq tabmanager dom 對象
var slideSpeed = 250; //設定開關時滑動時間
var scrollPosition = 0;
var flagUpdating = false
init();

function init(){
    //插入管理器根元素
    var div = document.createElement("div");
    div.classList.add("tabmagager");  //設定class屬性
    div.style.background = "#cccccc"; 
    div.style.height = "100%";
    div.style.width = "20rem";
    div.style.position = "fixed";
    div.style.top = "0px";
    div.style.right = "0px";
    div.style.zIndex = "90000000";
    div.style.display = "none";
    div.style.borderStyle="none"
    div.frameBorder = "none";
    div.target="_parent";
    document.body.appendChild(div);

    tabmg =  $('div.tabmagager'); 

    //導入管理器主體
    $.get(chrome.extension.getURL('/contents/tabManagerDesign.html'),data=>{
    $('div.tabmagager').append(data);
    });

    //鎖定右鍵
    
    tabmg.bind('contextmenu',function(e){
        return false;    
    });
}

window.onload=()=>{
    //更新搜尋
    tabmg.find('.tabSearchBar').on('input propertychange',(e)=>{
        chrome.runtime.sendMessage({command:"changeSearchStr",str:$(e.target).val()});
        console.log($(e.target).val());
    });
    
    tabmg.find('.tabSearchBar').on('click',()=>{
        tabmg.find('.tabSearchBar').select();
    });
}

//顯示管理器視窗
function ShowManager(){
    updateTabList();
    tabmg.show("slide",{direction:"right"},slideSpeed);
    tabmg.focus();
}

//關閉管理器視窗
function HideManager(){
    tabmg.hide("slide",{direction:"right"},slideSpeed);
}

//開關管理器視窗
function changeManagerDisplay(open){
    if(open==null) (tabmg.css("display")=="none")?ShowManager():HideManager();
    else if(open) ShowManager();
    else HideManager();
};

//清除分頁列表元素
function cleanManagerList()
{
    tabmg.find('div.list').empty();
}

//將js字串轉成html安全字串
function htmlEncode(value){
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html();
}

//添加分頁列表元素
//tab:chrome.tabs.Tab 物件
function addManagerTab(tab)
{
    tabmg.find('.list').append(
        `<div class='listItem ${tab.managerSelect?'listItem_selected':''}' tabid='${tab.id}'>
            <span class='tabobj'>
                <img class='favicon' src='${((tab.favIconUrl!=null)?tab.favIconUrl:chrome.extension.getURL("imgs/difaultFavicon.png"))}'>
                <span class='tabtitle'>${htmlEncode(tab.title)}</span>
            </span>
            <img src='${chrome.extension.getURL("imgs/closeButton.png")}' class='closeButton' height='20' width='20'/>
        </div>`
    );   
}

//移除分頁列表特定元素
//tabId:chrome 分頁唯一識別碼
/*
function removeManagerTab(tabId)
{
    tabmg.find('.listItem').each((i,e)=>{
        if($(e).attr('tabid')==tabId)
        {
            closeTab($(e));
        }
    });
}
*/

//取得 Tab Id
function getTabIdByObj(jqobj)
{
    return jqobj.closest('.listItem').attr('tabid');
}

//取得 List Item
function getListItemByChild(jqobj)
{
    return jqobj.closest('.listItem');
}

function getListItemById(tabId)
{
    tabmg.find('.listItem').each((i,e)=>{
        var obj = $(e);
        if(getTabIdBy(obj)==tabId)return obj;
    });
}

//取得選取分頁狀態
function IsTabSelect(listItem)
{
    return listItem.hasClass('listItem_selected');
}

//關閉分頁並移除列表元素
function closeTab(listItem)
{
    chrome.runtime.sendMessage({'command':"closeTabs",'tabIds':Number(getTabIdByObj(listItem))}); //呼叫後台關閉分頁
}

//關閉選取分頁
function closeTabSelect(){
    let tabIds = [];
    tabmg.find('.listItem_selected').each((i,e)=>{
        tabIds.push(Number(getTabIdByObj($(e))));
    });
    chrome.runtime.sendMessage({'command':"closeTabs",'tabIds':tabIds}); //呼叫後台關閉分頁
}

//刷新分頁列表
function updateTabList()
{
    if(flagUpdating)return;else flagUpdating = true;
    console.log("updating")
    let tempScrollPosition = scrollPosition;
    cleanManagerList();
    
    chrome.runtime.sendMessage({command:"getManagerInfo"},(res)=>{  //取得當前分頁列表(內容腳本無權限，需調用後台腳本)    
        if(tabmg.find('.searchBar').val()!=res.searchStr)tabmg.find('.searchBar').val(res.searchStr);
        res.list.forEach(element => {
           node = addManagerTab(element);
        });

        //tabmg.find('.list').scrollTo(0,tempScrollPosition);
        flagUpdating = false;
    });
}

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse)
    {
        switch(message.command)
        {
            case "key_openTabManager": //監聽開關管理器熱鍵按下事件
            {
                changeManagerDisplay(null);
                break;
            }

            case "updateManager":
            {
                updateTabList();
                break;
            }
            default:
            break;
        }
    }
)

//分頁切換控制
tabmg.on('click','.tabobj',(event)=>{
    if(!event.ctrlKey)
    {
        var id = getTabIdByObj($(event.target));  //取得分頁id
        chrome.runtime.sendMessage({'command':"ChangeCurentTab",'tabId':id});  //呼叫後台切換分頁
        //changeManagerDisplay(false);  //關閉管理器分頁視窗
    }   
});

//關閉分頁
tabmg.on('click','.closeButton',(event)=>{ //監聽關閉按鈕按下事件
    closeTab(getListItemByChild($(event.target)));
})

//監聽listItem層級滑鼠事件
tabmg.on("mousedown", '.listItem', function(e) {
    switch(e.which)
    {
        case 1:
        {
            if(e.ctrlKey)chrome.runtime.sendMessage({'command':"changeTabSelect",tabId:getTabIdByObj($(event.target).closest('.listItem'))});
            break;
        }
        //滑鼠中鍵
        case 2:
        {
            closeTab(getListItemByChild($(e.target)));
            break;
        }
        //滑鼠右鍵
        case 3:
        {
            break;
        }
    }
});

tabmg.on("scroll",'.list',function(e){
    scrollPosition = target.scrollTop;
});

//監聽全域按鍵事件
document.onkeydown=(e)=>{
    console.log(e.which);

    if(tabmg.css('display')!='none')
    {
        if(e.which==27)chrome.runtime.sendMessage({command:"cancelSelect"});
        else if(e.which==46 && document.activeElement.id !='sBar'&&!tabmg.find('.searchBar').is(":focus"))
        {
            closeTabSelect();
        }
        else if(e.which==65 && e.ctrlKey&&!tabmg.find('.searchBar').is(":focus"))
        {
            chrome.runtime.sendMessage({command:"selectAll"});
            return false;
        }
        
    }
};
