# simpleNewTab

这是一个浏览器扩展程序，它会改变浏览器新标签页的样式。配合[随机图片 api](https://github.com/yige233/randomPic)，实现每打开新标签页就换壁纸的功能。

可以在微软扩展商店安装：[点击前往](https://microsoftedge.microsoft.com/addons/detail/%E7%AE%80%E5%8D%95%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/bddinabncgldjjidbajkahmihejnkjlc)

### 关于扩展

它的来源是：我有一个挺大的壁纸文件夹(>500 张)，我希望这些壁纸可以在浏览器的新标签页中随机展现，而现有的新标签页扩展，没有能满足这一需求的（起码我自己没找到）。
一些扩展只能从固定的那些壁纸库里随机获取壁纸；一些扩展允许用户将壁纸上传至云端，但他们云端也是有成本的，不可能装下我这么多壁纸；
一些扩展使用 indexeddb 存储用户选择的壁纸，但存储这么多壁纸，太浪费空间了，这相当于将整个壁纸文件夹复制一份。

所以自己动手整了一个。如果你有相同或类似的问题，可以试试使用这个扩展。

### 功能

- 当打开新标签页时，随机切换壁纸。
  - 如果壁纸因为尺寸问题被浏览器裁剪，还可以拖动壁纸，将其调整至自己喜欢的位置。1.5.0 起，可以通过快捷键 Alt+S 保存壁纸的位置，Alt+D 删除保存的位置。快捷键也可以自行调整。只有默认壁纸和从 api 获取的壁纸能够保存位置。
  - 如果是从旧版本升级上来的，可能需要前往扩展管理页的 [键盘快捷方式](edge://extensions/shortcuts)(edge://extensions/shortcuts) 处手动设置下快捷键。
- 可以在新标签页建立便签，方便快速记下灵感。
  - 按住 Ctrl 并点击新标签页任意位置即可建立一个便签；按住 Shift 并点击便签的标题即可删除该便签。
  - 便签可拖动，可以改变大小。
  - 也可以在可以在扩展页的“键盘快捷键”处，为新建便签设置快捷键。
- 可以通过新标签页快速发起图片反向搜索。
  - 可以将图片拖入新标签页，也可以通过右键菜单选择图片。
- 可以为 ChromeOS 设置桌面壁纸。

### 特点

- 简单
  - 新标签页只有壁纸和可能存在的便签。
  - 没有时间显示。要看时间，请找你的操作系统。
  - 没有搜索框。地址栏不是很宽敞吗？
  - 便签只有标题栏和内容框，没有多余的按钮。
- 轻占用。壁纸源使用自定义的随机壁纸 api，api 可以部署在本机、内网中的其他设备如 Nas，甚至是公网上，相较于使用 indexddb 存储用户图片的方式，使用 api 获取图片不会占用用户的存储空间。
- 后台缓存下一次将要使用的壁纸，提升慢速网络下的使用体验。

- 便签内容会在不同新标签页中同步。

### 使用扩展

- 这个扩展的核心就在于使用自定义的图片 api。关于如何搭建 api，请看[这里](https://github.com/yige233/randomPic)
- 如果是在本机上搭建 api，那么你的 api 地址就应该是[http://localhost:3000/](http://localhost:3000/)，这也是扩展的默认 api 地址。
- 当你的 api 开始工作，这个扩展应当也可以工作了。

### 其他

虽然 chromium 系浏览器有提供 Storage API，但本扩展还是用了 indexeddb 来存储配置数据，因此也得以存储默认壁纸和缓存壁纸，优化体验。但扩展不会因此使用过多存储空间，
毕竟只存储了最多两张图片（除非是图片本身尺寸超大）。

3.0.0 起，放弃了用 indexeddb 存储数据，改为用 cachedStorage，相比于 indexeddb，cachedStorage 的使用相对简单，也不容易出错了。
同时，通过创建离屏文档，也更能够保证后台服务的存活了。
