chrome.tabs.onUpdated.addListener((_, { status }, tab) => {
    if (status === 'complete') {
        activeArticleQueue.add(tab.url);
    }
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
        if (tab && !tab.url.startsWith('chrome://')) {
            activeArticleQueue.add(tab.url);
        }
    });
});
const activeArticleQueue = new Set();
let cacheTags = null;
let readyCollectArticles = []; // 即将被清理的
// const readyCollectOffsetTime = 864e5; // 文章销毁的截止时间<=一天将提示用户
const readyCollectOffsetTime = 3e4;

let fetchDataSuccess = false;
let fetchCallback = null;
(function fetchData() {
    chrome.storage.sync.get('tags', ({ tags }) => {
        cacheTags = tags;
        fetchDataSuccess = true;
        fetchCallback && fetchCallback(tags);
        updateArticles();
    });
})();

let showTipFlag = false;
let loopGapTime = 10000;

function updateArticles() {
    if (Array.isArray(cacheTags)) {
        const activeUrlArray = Array.from(activeArticleQueue);
        activeArticleQueue.clear();
        readyCollectArticles = []; // 存放即将要被删除的文章
        const currentTime = Date.now();
        cacheTags.forEach((tag) => {
            const { articles = [] } = tag;
            articles.forEach((item) => {
                if (activeUrlArray.includes(item.url)) {
                    item.deadline += 864e5 * 7; // 截止日期增加7天
                }
            });
            const _articles = articles.reduce((arr, article) => {
                const { deadline } = article;
                if (deadline > currentTime) {
                    article.deadline -= loopGapTime;
                    if (deadline - currentTime <= readyCollectOffsetTime) {
                        article.readyCollected = true;
                        readyCollectArticles.push(article);
                    } else {
                        article.readyCollected = false;
                        arr.push(article);
                    }
                } 
                return arr;
            }, []);
            // 根据过期时间降序
            _articles.unshift(...readyCollectArticles.sort((a, b) => {
                return b.deadline - a.deadline;
            }));
            tag.articles = _articles;
            chrome.storage.sync.set({ tags: cacheTags }, () => {
                setTimeout(updateArticles, loopGapTime);
            }); // 新数据本地保存
        });

        if (!showTipFlag && readyCollectArticles.length > 0) {
            showTipFlag = true;
            showNotifications(`你有${readyCollectArticles.length}篇收藏的文章即将被清理`);
        }
    }
}

function sendMessage(data) {
    chrome.runtime.sendMessage(data);
}
function showNotifications(message) {
    chrome.notifications.create(null, {
        message,
        type: 'basic',
        title: '【收藏清理工】提醒',
        iconUrl: './assets/images/get_started128.png',
    });
}
chrome.runtime.onMessage.addListener(
    function(request, _, sendResponse) {
        if (request.type === 'fetchTags') {
            if (fetchDataSuccess) {
                sendResponse(cacheTags);
            } else {
                fetchCallback = sendResponse;
            }
            return;
        }
        if (request.type === 'syncData') { // popup.html修改了数据，需要同步到background
            chrome.storage.sync.set({ tags: request.data }, () => {
                cacheTags = request.data;
            });
        }
    }
);