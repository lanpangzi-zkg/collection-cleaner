// chrome.tabs.onActivated.addListener(({ tabId }) => {
//     showMsg(tabId);
// });
function showMsg(message = '你有即将被清理的收藏文章') {
    chrome.notifications.create(null, {
        type: 'basic',
        iconUrl: '../images/get_started16.png',
        title: '【收藏清理工】提醒',
        message,
    });
}

function querySelector(selector) {
    return document.querySelector(selector);
}
function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}

function hiddenEditTagBox(target) {
    const editBoxNode = target.parentElement;
    editBoxNode.classList.add('hidden');
    editBoxNode.previousElementSibling.classList.remove('hidden');
}
function getInputTagVal(input) {
    return input?.value.trim() || defaultTagName;
}
function queryParentElement(child, className) {
    let current = child;
    let parentElement = null;
    if (child.classList.contains(className)) {
        return child;
    }
    while((current = current.parentElement)) {
        if (current.classList.contains(className)) {
            parentElement = current;
            break;
        }
    }
    return parentElement;
}
let globalTags = [];

function hiddenTagInitBox() {
    querySelectorAll('.tag-init-box').forEach((initBox) => {
        if (!initBox.classList.contains('hidden')) {
            hideNode(initBox);
            const tagNameNode = initBox.nextElementSibling;
            // 本地保存标签
            const tagName = getInputTagVal(initBox.querySelector('input'));
            if (chrome?.storage) {
                globalTags.push({
                    id: Date.now(),
                    tagName,
                    articles: [],
                });
                chrome.storage.sync.set({
                    tags: globalTags,
                }, () => {
                    tagNameNode.querySelector('span').innerText = tagName;
                    showNode(tagNameNode);
                    showNode(initBox.parentElement.nextElementSibling);
                });
            } else {
                tagNameNode.querySelector('span').innerText = tagName;
                showNode(tagNameNode);
                showNode(initBox.parentElement.nextElementSibling);
            }
        }
    });
}
function hiddenToolbar() {
    querySelectorAll('.toolbar').forEach((toolbar) => {
        if (!toolbar.classList.contains('hidden')) {
            toolbar.querySelector('.popover').classList.add('hidden');
            toolbar.classList.add('hidden');
        }
    });
}
function resetUI() {
    hiddenToolbar();
    hiddenTagInitBox();
}
function toggleNodeVisible(node) {
    node.classList.toggle('hidden');
}
function showNode(node) {
    node.classList.remove('hidden');
}
function hideNode(node) {
    node.classList.add('hidden');
}
function toggleEmptyTips(wrapperClass, emptyTipClass, targetClass) {
    const wrapperNode = wrapperClass instanceof HTMLElement ? wrapperClass : querySelector(wrapperClass);
    const emptyNode = wrapperNode.querySelector(emptyTipClass);
    const targetItems = wrapperNode.querySelectorAll(targetClass);
    if (targetItems.length > 0) {
        hideNode(emptyNode);
    } else {
        showNode(emptyNode);
    }
}
function checkTagIsEmpty() {
    toggleEmptyTips('.tag-list', '.empty-tag', '.tag-item');
}

function checkArticlesIsEmpty(target) {
    toggleEmptyTips(queryParentElement(target, 'article-list'), '.empty-article', '.article-item');
}
function syncTagNameToLocal(id, tagName) {
    const target = globalTags.find((tagItem) => {
        return tagItem.id == id;
    });
    if (target) {
        target.tagName = tagName;
        updateStorage({
            tags: globalTags,
        });
    }
}
function syncDeleteTagToLocal(id) {
    updateStorage({
        tags: globalTags.filter((tagItem) => {
            return tagItem.id != id;
        })
    });
}
const defaultTagName = 'default tag';
function bindEvents() {
    querySelector('.tag-list').addEventListener('click', ({ target }) => {
        if (target.classList.contains('tag-name')) {
            toggleNodeVisible(target.parentElement.nextElementSibling);
            target.querySelectorAll('.arrow').forEach((arrowNode) => {
                toggleNodeVisible(arrowNode);
            });
        }
    });
    window.addEventListener('click', ({ target }) => {
        const { classList } = target;
        if (classList.contains('setting')) { // 标签设置点击
            resetUI();
            toggleNodeVisible(target.querySelector('.toolbar'));
            return;
        }
        if (classList.contains('tag-edit')) { // 显示编辑标签名
            const toolbarNode = target.parentElement;
            const settingNode = toolbarNode.parentElement;
            const editBoxNode = settingNode.previousElementSibling;
            const showTagNode = editBoxNode.previousElementSibling;
            editBoxNode.classList.remove('hidden');
            showTagNode.classList.add('hidden');
            toolbarNode.classList.toggle('hidden');
            editBoxNode.querySelector('input').value = showTagNode.innerText.trim();
            return;
        }
        if (classList.contains('tag-delete')) { // 即将删除标签，显示确认框
            toggleNodeVisible(target.nextElementSibling);
            return;
        }
        if (classList.contains('edit-ok')) { // 编辑标签确认
            const tagName = getInputTagVal(target.previousElementSibling);
            target.parentElement.previousElementSibling.querySelector('span').innerText = tagName;
            syncTagNameToLocal(target.dataset.id, tagName);
            hiddenEditTagBox(target);
            return;
        }
        if (classList.contains('edit-cancel')) { // 编辑标签取消
            hiddenEditTagBox(target);
            return;
        }
        if (classList.contains('article-add')) { // 添加收藏文章
            const tagItemNode = queryParentElement(target, 'tag-item');
            const articlesNode = tagItemNode.querySelector('.article-list');
            const listNode = articlesNode.querySelector('ul');
            if (articlesNode.classList.contains('hidden')) {
                tagItemNode.querySelector('.tag-name').click();
            }
            const anchor = listNode.firstElementChild;
            const newArticleNode = createArticleNode(null, true);
            listNode.insertBefore(newArticleNode, anchor);
            hiddenToolbar();
            checkArticlesIsEmpty(articlesNode);
            return;
        }
        if (classList.contains('article-ok')) {
            const parentNode = target.parentElement;
            const urlInptNode = parentNode.querySelector('.url');
            const urlErrorNode = urlInptNode.nextElementSibling;
            const titleInptNode = parentNode.querySelector('.title');
            const titleErrorNode = titleInptNode.nextElementSibling;
            const url = urlInptNode.value?.trim();
            const title = titleInptNode.value?.trim();
            if (!url) {
                urlInptNode.classList.add('error');
                showNode(urlErrorNode);
            } else {
                urlInptNode.classList.remove('error');
                hideNode(urlErrorNode);
            }
            if (!title) {
                titleInptNode.classList.add('error');
                showNode(titleErrorNode);
            } else {
                titleInptNode.classList.remove('error');
                hideNode(titleErrorNode);
            }
            if (!url || !title) {
                return;
            }
            let nextNode = parentNode;
            while((nextNode = nextNode.nextElementSibling)) {
                if (nextNode.classList.contains('title')) {
                    nextNode.innerText = title;
                    nextNode.href = url;
                }
                showNode(nextNode);
            }
            parentNode.remove();
            return;
        }
        if (classList.contains('article-cancel')) { // 取消添加文章
            const articlesNode = queryParentElement(target, 'article-list');
            queryParentElement(target, 'article-item').remove();
            checkArticlesIsEmpty(articlesNode);
            return;
        }
        if (classList.contains('article-delete')) { // 删除文章
            const articlesNode = queryParentElement(target, 'article-list');
            target.parentElement.remove();
            checkArticlesIsEmpty(articlesNode);
            return;
        }
        if (classList.contains('empty-article')) { // 点击空白提示，显示添加文章
            queryParentElement(target, 'tag-item').querySelector('.article-add').click();
            hideNode(target);
            return;
        }
        if (classList.contains('empty-tag')) { // 点击空白提示，显示添加标签
            querySelector('.btn-add-tag').click();
            hideNode(target);
            return;
        }
        if (classList.contains('popover-cancel') || classList.contains('popover-ok')) {
            if (classList.contains('popover-ok')) { // 确认删除标签
                const tagItemNode = queryParentElement(target, 'tag-item');
                if (tagItemNode) {
                    tagItemNode.remove();
                    syncDeleteTagToLocal(target.dataset.id);
                    checkTagIsEmpty();
                }
            }
            hiddenToolbar();
            return;
        }
        if (classList.contains('inpt')) {
            return;
        }
        resetUI();
    });
    // 添加标签
    const addTagBtnNode = querySelector('.btn-add-tag');
    addTagBtnNode.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentNode = querySelector('.tag-list');
        const anchor = parentNode.firstElementChild;
        const newTagNode = createTagNode(null, true);
        const initNode = newTagNode.querySelector('.tag-init-box');
        initNode.querySelector('.init-name').value = defaultTagName;
        parentNode.insertBefore(newTagNode, anchor);
        checkTagIsEmpty();
    });
}
function createTagNode(data, isNew = false) {
    const { id, tagName = defaultTagName, articles = [] } = data || {};
    const newTagNode = document.createElement('div');
    newTagNode.className = 'tag-item';
    newTagNode.innerHTML = `
        <div class="tag-header l-r-layout">
            <div class="flex-center-box tag-init-box${isNew ? '' : ' hidden'}">
                <input class="inpt init-name">
            </div>
            <div class="flex-center-box tag-name${isNew ? ' hidden' : ''}">
                <span>${tagName}</span>
                <i class="arrow down">
                    <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                        <path d="M500.8 604.779L267.307 371.392l-45.227 45.27 278.741 278.613L779.307 416.66l-45.248-45.248z" p-id="3219"></path>
                    </svg>
                </i>
                <i class="arrow up hidden">
                    <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                        <path d="M500.8 461.909333L267.306667 695.296l-45.226667-45.269333 278.741333-278.613334L779.306667 650.026667l-45.248 45.226666z" p-id="3364"></path>
                    </svg>
                </i>
            </div>
            <div class="flex-center-box tag-edit-box hidden">
                <input class="inpt new-name" autofocus>
                <button class="btn m-l-5 primary edit-ok" data-id="${id}">确定</button>
                <button class="btn m-l-5 edit-cancel">取消</button>
            </div>
            <div class="setting">
                <svg viewBox="0 0 1024 1024" width="1em" height="1em">
                    <path d="M512 512m-116.949333 0a116.949333 116.949333 0 1 0 233.898666 0 116.949333 116.949333 0 1 0-233.898666 0Z" p-id="2146" fill="currentColor"></path>
                    <path d="M512 159.616m-116.949333 0a116.949333 116.949333 0 1 0 233.898666 0 116.949333 116.949333 0 1 0-233.898666 0Z" p-id="2147" fill="currentColor"></path>
                    <path d="M512 864.384m-116.949333 0a116.949333 116.949333 0 1 0 233.898666 0 116.949333 116.949333 0 1 0-233.898666 0Z" p-id="2148" fill="currentColor"></path>
                </svg>
                <div class="toolbar hidden">
                    <button class="article-add">
                        <i class="icon">+</i>
                        文章
                    </button>
                    <button class="tag-edit">
                        <i class="icon">
                            <svg viewBox="0 0 1024 1024"  width="1em" height="1em" fill="currentColor">
                                <path d="M694.037333 213.333333v64H234.666667v469.333334h512V512h64v234.666667a64 64 0 0 1-64 64H234.666667a64 64 0 0 1-64-64V277.333333a64 64 0 0 1 64-64h459.370666z m136.746667 24.234667l45.098667 45.397333-343.722667 341.290667 0.128 0.128-46.592 1.578667 1.322667-47.274667 0.085333 0.106667 343.68-341.226667z" p-id="2142"></path>
                            </svg>
                        </i>
                        编辑
                    </button>
                    <hr>
                    <button class="tag-delete">
                        <i class="icon">
                            <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                                <path d="M504.224 470.288l207.84-207.84a16 16 0 0 1 22.608 0l11.328 11.328a16 16 0 0 1 0 22.624l-207.84 207.824 207.84 207.84a16 16 0 0 1 0 22.608l-11.328 11.328a16 16 0 0 1-22.624 0l-207.824-207.84-207.84 207.84a16 16 0 0 1-22.608 0l-11.328-11.328a16 16 0 0 1 0-22.624l207.84-207.824-207.84-207.84a16 16 0 0 1 0-22.608l11.328-11.328a16 16 0 0 1 22.624 0l207.824 207.84z" p-id="4167"></path>
                            </svg>
                        </i>
                        删除
                    </button>
                    <div class="popover hidden">
                        <div class="tips m-b-15">将会删除标签下所有收藏，确定删除？</div>
                        <div style="text-align: right;">
                            <button class="btn small popover-cancel">取消</button>
                            <button class="btn primary small m-l-5 popover-ok" data-id="${id}">确定</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="article-list${isNew ? ' hidden' : ''}">
            <ul></ul>
            <div class="empty-article empty-tips">标签下空空如也，点击添加一篇文章吧~</div>
        </div>
    `;
    if (Array.isArray(articles) && articles.length > 0) {
        const articleWrapper = newTagNode.querySelector('.article-list');
        showNode(articleWrapper);
        const listNode = articleWrapper.querySelector('ul');
        const fragment = document.createDocumentFragment();
        articles.forEach((item) => {
            fragment.appendChild(createArticleNode(item));
        });
        listNode.appendChild(fragment);
        hideNode(articleWrapper.querySelector('.empty-tips'));
    }
    return newTagNode;
}
function createArticleNode(data, isNew = false) {
    const { id = '', title = '', url = '', deadline } = data || {};
    const newArticleNode = document.createElement('li');
    newArticleNode.className = 'article-item';
    newArticleNode.innerHTML = `
        <div class="edit-box${isNew ? '' : ' hidden'}">
            <input class="inpt url" placeholder="url地址" type="text"><span class="error-tips hidden">请输入</span>
            <input class="inpt m-l-5 title" placeholder="名称" type="text"><span class="error-tips hidden">请输入</span>
            <button class="btn small primary m-l-5 article-ok" data-id="${id}">确定</button>
            <button class="btn small m-l-5 article-cancel">取消</button>
        </div>
        <a class="title hidden" target="_blank" rel="noopener noreferrer" href="${url}">${title}</a>
        <i class="article-delete hidden" data-id="${id}">
            <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                <path d="M504.224 470.288l207.84-207.84a16 16 0 0 1 22.608 0l11.328 11.328a16 16 0 0 1 0 22.624l-207.84 207.824 207.84 207.84a16 16 0 0 1 0 22.608l-11.328 11.328a16 16 0 0 1-22.624 0l-207.824-207.84-207.84 207.84a16 16 0 0 1-22.608 0l-11.328-11.328a16 16 0 0 1 0-22.624l207.84-207.824-207.84-207.84a16 16 0 0 1 0-22.608l11.328-11.328a16 16 0 0 1 22.624 0l207.824 207.84z" p-id="4167"></path>
            </svg>
        </i>
    `;
    return newArticleNode;
}
function queryStorage(key, callback) {
    chrome.storage.sync.get(key, callback);
}
function updateStorage(data, callback) {
    chrome.storage.sync.set(data, callback);
}
function fetchTags() {
    queryStorage('tags', ({ tags }) => {
        globalTags = tags;
        renderData();
    });
}
function renderData() {
    if (Array.isArray(globalTags) && globalTags.length > 0) {
        const fragment = document.createDocumentFragment();
        globalTags.forEach((item) => {
            fragment.appendChild(createTagNode(item));
        });
        querySelector('.tag-list').appendChild(fragment);
        checkTagIsEmpty();
    }
}
// 根据过期时间排序
function sortCollectionList() {

}

function setup() {
    bindEvents();
    fetchTags();
    renderData();
}

document.addEventListener('DOMContentLoaded', setup);