import catanImg from '@/assets/catan.png';
import CATAN_DETAILS from './catan'
import MANILA_DETAILS from './manila'

// 游戏详细规则数据
export const GAME_DETAILS = {
  // 卡坦岛的详细信息
  "2": CATAN_DETAILS,
  // 一夜终极狼人的详细信息
  "1": {
    introduction: "《一夜终极狼人》是一款经典的身份推理类桌游，适合3-10人游玩，每局游戏仅需10分钟左右。游戏以狼人杀为基础，但进行了创新改良，没有淘汰机制，所有玩家都能参与到游戏结束。",
    objective: "不同阵营有不同的获胜条件：好人阵营需要票死狼人，狼人阵营需要隐藏身份，特殊阵营有独立的胜利条件。",
    victoryConditions: [
      {
        text: "好人阵营：在投票环节中成功票死至少一名狼人即可获胜",
        image: null
      },
      {
        text: "狼人阵营：隐藏自己的身份，确保没有狼人被票死即可获胜",
        image: null
      },
      {
        text: "特殊阵营（如皮匠）：如果自己被全场票死，则单独获胜",
        image: null
      }
    ],
    gameplaySteps: [
      {
        title: "分发身份",
        desc: "洗混角色牌（玩家数+3张），每人发一张暗置面前，中央放三张底牌。",
        image: null
      },
      {
        title: "夜晚行动",
        desc: "所有人闭眼。按照App或主持人的语音提示，特定角色依次睁眼执行技能（如预言家看牌、强盗换牌等）。",
        image: null
      },
      {
        title: "白天讨论",
        desc: "所有人睁眼。大家有几分钟的时间自由讨论，由于夜晚牌可能被换，所以每个人都可能不再是最初的身份！",
        image: null
      },
      {
        title: "投票处决",
        desc: "时间到，大家倒数3、2、1，同时指向一名怀疑对象。得票最多的人被处决，翻开他现在的身份牌判定胜负。",
        image: null
      }
    ],
    tips: [
      "使用官方配套的手机App来替代法官播音，确保夜晚流程不会出错",
      "注意观察其他玩家的表情和发言，寻找逻辑漏洞",
      "作为好人，尽量分享自己的信息，帮助团队找出狼人",
      "作为狼人，要善于伪装，混入好人阵营"
    ]
  },
  "6": MANILA_DETAILS
};

export default GAME_DETAILS;