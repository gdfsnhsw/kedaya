const Template = require('../../template');

class Main extends Template {
    constructor() {
        super()
        this.title = "京东种豆得豆"
        this.cron = `${this.rand(0, 59)} */8 * * *`
        this.task = 'local'
        this.turn = 2
        this.interval = 6000
        this.import = ['jdUrl', 'jdAlgo', 'fs']
    }

    async prepare() {
        this.algo = new this.modules['jdAlgo']({
            type: 'main',
            version: '3.1'
        })
        try {
            let txt = this.modules.fs.readFileSync(`${this.dirname}/invite/jd_task_plantBean.json`).toString()
            this.code = this.loads(txt)
        } catch (e) {
        }
        console.log(this.dumps(this.code))
    }

    async main(p) {
        let cookie = p.cookie;
        // this.options["headers"]["user-agent"] = this.getUa()
        let user = p.user
        let lists = this.column(this.code, 'plantUuid')
        if (this.turnCount == 0) {
            var index = await this.algo.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=plantBeanIndex&appid=signed_wh5&body={"monitor_source":"plant_m_plant_index","monitor_refer":"","version":"9.2.4.3"}&client=apple&clientVersion=13.2.8&networkType=wifi&osVersion=13.1.0&partner=&d_brand=iPhone&d_model=iPhone13,3&screen=844*390&adid=&uemps=0-2-999&ext={%22prstate%22:%220%22}`,
                    cookie,
                    algo: {
                        'appId': 'd246a',
                    }
                }
            )
            if (this.haskey(index, 'code', '3')) {
                console.log(`没有获取到数据`)
                return
            }
            else if (this.haskey(index, 'code', '411')) {
                console.log(`前方道路拥挤,等待两分钟`)
                return
            }
            var plantUuid
            if (this.haskey(index, 'data.jwordShareInfo')) {
                let share = this.query(index.data.jwordShareInfo.shareUrl, '&', 1)
                plantUuid = share.plantUuid
                if (!lists.includes(plantUuid)) {
                    this.code.push({user, plantUuid})
                }
            }
            let roundId
            for (let r of this.haskey(index, 'data.roundList')) {
                if (!roundId && r.dateDesc.includes('本期')) {
                    roundId = r.roundId
                }
                if (r.awardState == 5) {
                    let reward = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=receivedBean&body={"monitor_refer":"receivedBean","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            cookie
                        }
                    )
                    if (this.haskey(reward, 'data.awardBean')) {
                        console.log(`获取上期奖励: ${reward.data.awardBean}`)
                        this.notices(`获取上期奖励: ${reward.data.awardBean}`, p.user)
                    }
                }
                else if (r.roundState == 2) {
                    let re = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=receiveNutrients&body={"monitor_refer":"plant_receiveNutrients","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            cookie
                        }
                    )
                    for (let j of r.bubbleInfos) {
                        console.log(`获取${j.name}: ${j.nutrNum}`)
                        let culture = await this.algo.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=cultureBean&body={"monitor_refer":"plant_index","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","nutrientsType":"${j.nutrientsType}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                cookie, algo: {
                                    appId: '6a216'
                                }
                            }
                        )
                    }
                }
            }
            for (let i of this.haskey(index, 'data.taskList')) {
                if (i.isFinished) {
                    console.log(i.taskName, "任务已经完成")
                    if (i.taskType == 2) {
                        if (plantUuid) {
                            for (let kk of this.code) {
                                if (kk.plantUuid == plantUuid) {
                                    kk.finish = 1
                                }
                            }
                        }
                    }
                }
                else {
                    console.log(`开始做 ${i.taskName}任务`, i.taskType);
                    let totalNum = parseInt(i.totalNum)
                    let gainedNum = parseInt(i.gainedNum)
                    switch (i.taskType) {
                        case 2:
                            if (plantUuid) {
                                for (let kk of this.code) {
                                    if (kk.plantUuid == plantUuid) {
                                        kk.finish = 0
                                    }
                                }
                            }
                            break
                        case 57:
                            await this.algo.curl({
                                    'url': `https://m.jingxi.com/jxbfd/user/DoubleSignDeal?g_ty=h5&g_tk=&appCode=msd1188198&__t=1657108409440&dwEnv=7&strDeviceId=a3b4e844090b28d5c38e7529af8115172079be4d&strZone=jxbfd&bizCode=jxbfd&source=jxbfd&_cfd_t=1657108409190&_stk=__t%2C_cfd_t%2CbizCode%2CdwEnv%2Csource%2CstrDeviceId%2CstrZone&_ste=1&h5st=20220706195330228%3B1980457211661562%3B10032%3Btk02w78551ad830nuMcGB4Qsv9QxapLP7gZdOCYE5PVV%2Bna%2Bb4KU21drJq64oP82965Vdc1tGqVU%2Flp7ydcZ5XgH0Feh%3B241b6f1d21bf8e41f380a5dd29a7bac2a6f1f65a0c7ef1b1f751eaea4c40dd9c%3B3.0%3B1657108410228&sceneval=2`,
                                    // 'form':``,
                                    cookie
                                }
                            )
                            await this.wait(2000)
                            await this.algo.curl({
                                    'url': `https://wq.jd.com/jxjdsignin/SignedInfo?channel=jx_zdddsq&_t=1657108415230&h5st=20220706195335235%3B9699666907452188%3B0f6ed%3Btk02wacc21c5518nsBms0rLLAn98Xun6p1dT6CW8Pkictd4WSbmiuCg8ZokHnTWf8b7LrBNq0ADjUcmobc3%2BX8Caeday%3Bfeaa80ef87c85cd9de17d9a9f5d40e02150d9e5c3734c8a42a4a33e64fc60668%3B3.0%3B1657108415235&_stk=_t%2Cchannel&_=1657108415242&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    // 'form':``,
                                    cookie
                                }
                            )
                            await this.wait(2000)
                            let reward = await this.algo.curl({
                                    'url': `https://wq.jd.com/jxjdsignin/IssueReward?channel=jx_zdddsq&_t=1657108494784&_stk=_t%2Cchannel&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    // 'form':``,
                                    cookie
                                }
                            )
                            break
                        case 96:
                            let sign = await this.curl({
                                    'url': `https://wq.jd.com/tjjdsignin/SignedInfo?channel=jx_zdddsq&_t=1663080425215&&_stk=_t%2Cchannel&_=1663080425642&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    algo: {
                                        appId: '0f6ed',
                                        type: "pingou"
                                    },
                                    cookie
                                }
                            )
                            await this.wait(4000)
                            let reward2 = await this.curl({
                                    'url': `https://wq.jd.com/tjjdsignin/IssueReward?channel=jx_zdddsq&_t=1663080432487&_stk=_t%2Cchannel&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    // 'form':``,
                                    cookie,
                                    algo: {
                                        appId: '0f6ed',
                                        type: "pingou"
                                    }
                                }
                            )
                            break
                        case 92:
                            let receiveNutrientsTask = await this.curl(this.modules.jdUrl.app('receiveNutrientsTask', {
                                    "monitor_refer": "plant_receiveNutrientsTask",
                                    "monitor_source": "plant_app_plant_index",
                                    "awardType": "92",
                                    "version": i.version
                                }, 'post', cookie)
                            )
                            await this.wait(2000)
                            await this.curl(this.modules.jdUrl.app('gotConfigDataForBrand', {
                                    "k": "farmShareConfig",
                                    "babelChannel": "10",
                                    "channel": 3,
                                    "type": "json",
                                    "version": 16
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('initForFarm', {
                                    "version": 16,
                                    "channel": 3,
                                    "babelChannel": "10"
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('taskInitForFarm', {
                                    "version": 16,
                                    "channel": 3,
                                    "babelChannel": "10"
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('farmMarkStatus', {
                                    "version": 16,
                                    "channel": 3,
                                    "babelChannel": "10"
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('friendListInitForFarm', {
                                    "version": 16,
                                    "channel": 3,
                                    "babelChannel": "10"
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('gotConfigDataForBrand', {
                                    "k": "farmRule",
                                    "babelChannel": "10",
                                    "channel": 3,
                                    "type": "json",
                                    "version": 16
                                }, 'post', cookie)
                            )
                            let ddnc = await this.curl(this.modules.jdUrl.app('ddnc_toStayModal', {
                                    "version": 16,
                                    "channel": 3,
                                    "babelChannel": "10"
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('queryPathWithActId', {
                                    "babelChannel": "10",
                                    "channel": 3,
                                    "actId": "3KSjXqQabiTuD1cJ28QskrpWoBKT",
                                    "version": 16
                                }, 'post', cookie)
                            )
                            await this.curl(this.modules.jdUrl.app('isUserFollow', {
                                    "themeId": "519",
                                    "informationParam": {
                                        "isRvc": "0",
                                        "fp": "-1",
                                        "eid": "eidIf0aa8121d5saWrnr3ryoR6qt1FxGRFjFGVq57Vv5jwdgmcxSHUO23TTEORkTW84A92Fijx10j2lZfx228DL+PAqTpx3MK1VsIZiVGD2pPczQWVRx",
                                        "shshshfp": "-1",
                                        "userAgent": "-1",
                                        "referUrl": "-1",
                                        "shshshfpa": "-1"
                                    },
                                    "businessId": "1"
                                }, 'post', cookie)
                            )
                            break
                        case 10:
                            let channel = await this.curl({
                                    'url': `https://api.m.jd.com/client.action?functionId=plantChannelTaskList&body=%7B%7D&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                    // 'form':``,
                                    cookie
                                }
                            )
                            var list = [...channel.data.goodChannelList, ...channel.data.normalChannelList]
                            for (let n of list) {
                                if (n.taskState == '2') {
                                    let plantChannelNutrientsTask = await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=plantChannelNutrientsTask&body={"channelTaskId":"${n.channelTaskId}","channelId":"${n.channelId}"}&uuid=16496899654652091525278.275.1651079578494&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                            // 'form':``,
                                            cookie,
                                            algo: {
                                                appId: '2424e'
                                            }
                                        }
                                    )
                                    if (this.haskey(plantChannelNutrientsTask, 'data.nutrCount')) {
                                        console.log(this.haskey(plantChannelNutrientsTask, 'data.nutrToast'))
                                        gainedNum++
                                    }
                                    if (gainedNum == totalNum) {
                                        break
                                    }
                                }
                            }
                            break
                        case 3:
                            let shopTaskList =
                                await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=shopTaskList&body={"monitor_refer": "plant_receiveNutrients"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        cookie
                                    }
                                )
                            var list = [...(this.haskey(shopTaskList, 'data.goodShopList') || []), ...(this.haskey(shopTaskList, 'data.moreShopList') || [])]
                            for (let k of list) {
                                if (k.taskState == '2') {
                                    let shopNutrientsTask = await this.algo.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=shopNutrientsTask&body={"monitor_refer":"plant_shopNutrientsTask","version":"9.2.4.6","shopId":"${k.shopId}","shopTaskId":"${k.shopTaskId}"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                            cookie,
                                            algo: {
                                                appId: "19c88"
                                            }
                                        }
                                    )
                                    if (this.haskey(shopNutrientsTask, 'data.nutrCount')) {
                                        console.log(this.haskey(shopNutrientsTask, 'data.nutrToast'))
                                        gainedNum++
                                    }
                                    if (gainedNum == totalNum) {
                                        break
                                    }
                                    await this.wait(2000)
                                }
                            }
                            break
                        case 5:
                            console.log("开始执行:", i.taskName)
                            let productTaskList =
                                await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=productTaskList&body={"monitor_source":"plant_app_plant_index","monitor_refer":"plant_productTaskList","version":"9.2.4.6"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        cookie,
                                        algo: {appId: '7351b'}
                                    }
                                )
                            // console.log(productTaskList.data)
                            for (let z of this.haskey(productTaskList, 'data.productInfoList')) {
                                // console.log(z[0])
                                let productNutrientsTask = await this.algo.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=productNutrientsTask&body={"monitor_refer":"plant_productNutrientsTask","monitor_source":"plant_app_plant_index","productTaskId":"${z[0].productTaskId}","skuId":"${z[0].skuId}","version":"9.2.4.6"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        cookie,
                                        algo: {
                                            appId: 'a4e2d'
                                        }
                                    }
                                )
                                await this.wait(2000)
                                console.log(productNutrientsTask.data.nutrToast || productNutrientsTask.data)
                            }
                            break
                        default:
                            let s = await this.algo.curl({
                                    'url': `https://api.m.jd.com/client.action?functionId=receiveNutrientsTask&appid=signed_wh5&body={"awardType":"${i.taskType}","monitor_source":"plant_m_plant_index","monitor_refer":"plant_receiveNutrientsTask","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&networkType=wifi&osVersion=15.7.5&uuid=713528612071b94e23fcd28144db476f856f9fc5&partner=&d_brand=iPhone&d_model=iPhone8,1&screen=667*375&openudid=713528612071b94e23fcd28144db476f856f9fc5&adid=`,
                                    // 'form':``,
                                    cookie,
                                    algo: {
                                        appId: 'd22ac'
                                    }
                                }
                            )
                            console.log(this.haskey(s, 'data.nutrToast'))
                            break
                    }
                    await this.wait(2000)
                }
            }
            let friendList = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=plantFriendList&body={"version":"9.2.4.1","monitor_refer":"plantFriendList","monitor_source":"plant_app_plant_index","pageNum":"1"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                    cookie
                }
            )
            for (let i of this.haskey(friendList, 'data.friendInfoList')) {
                if (i.nutrCount) {
                    let collectUserNutr = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=collectUserNutr&body={"monitor_refer":"collectUserNutr","monitor_source":"plant_app_plant_index","roundId":"${roundId}","paradiseUuid":"${i.paradiseUuid}","version":"9.2.4.1"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            cookie,
                            algo: {
                                'appId': '14357',
                            }
                        }
                    )
                    let collectResult = this.haskey(collectUserNutr, 'data.collectResult')
                    if (collectResult == '3') {
                        console.log('今日帮助收取次数已达上限，明天再来帮忙吧')
                        break
                    }
                    else if (collectResult == '1') {
                        console.log(collectUserNutr.data.collectMsg.replace("*plantNickName*", i.plantNickName).replace('*friendNutrRewards*', collectUserNutr.data.friendNutrRewards).replace('*collectNutrRewards*', collectUserNutr.data.collectNutrRewards))
                    }
                    await this.wait(2000)
                }
            }
        }
        else {
            if (this.code.length == 0) {
                this.jump = 1
            }
            for (let k of this.code) {
                let uuid = k.plantUuid
                if (k.finish == 0) {
                    await this.wait(6000)
                    console.log(`正在助力: ${k.user}`)
                    let index = await this.algo.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=plantBeanIndex&body={"plantUuid":"${uuid}","monitor_source":"plant_m_plant_index","monitor_refer":"","version":"9.2.4.1"}&client=apple&clientVersion=13.2.8&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            cookie,
                            algo: {
                                'appId': 'd246a',
                            }
                        }
                    )
                    if (this.haskey(index, 'code', '3')) {
                        return
                    }
                    let res = this.haskey(index, 'data.helpShareRes') || {}
                    if (res.state == '1') {
                        console.log(`助力:`, uuid, res.promptText)
                    }
                    else if (res.state == '2') {
                        console.log(res.promptText)
                        break
                    }
                    else if (res.state == '3') {
                        console.log(res.promptText)
                        k.finish = 1
                    }
                    else if (res.state == '4') {
                        console.log(res.promptText)
                    }
                }
                else {
                    console.log(`助力: ${k.user} 已经完成,不需要再助力了`)
                }
            }
        }
    }

    async extra() {
        try {
            let dict = this.column(this.code, '', 'user')
            let json = []
            for (let cookie of this.cookies.all) {
                let user = this.userName(cookie)
                if (dict[user]) {
                    dict[user].finish = 0
                    json.push(dict[user])
                }
            }
            console.log(`全部助力码:`)
            console.log(this.dumps(json))
            if (this.profile.cache) {
                console.log("已经设置缓存:/invite/jd_task_plantBean.json,跳过写入")
            }
            else {
                if (json.length) {
                    await this.modules.fs.writeFile(`${this.dirname}/invite/jd_task_plantBean.json`, this.dumps(json), (error) => {
                        if (error) return console.log("写入化失败" + error.message);
                        console.log("京东种豆得豆ShareCode写入成功");
                    })
                }
            }
        } catch (e) {
        }
    }
}

module.exports = Main;
