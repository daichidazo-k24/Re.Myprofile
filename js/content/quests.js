/** 編集する場所: QUEST LOG / 学外活動ボード。
 * 活動追加: activities に {date,name,note(任意)} を追加。
 */
export const QUESTS_CONTENT = {
  heading: '学外活動',
  lead: '学内で得た知識を確かめ、実践へつなげるための取り組みです。',
  sectionTitles: {activities:'活動履歴',insight:'実践から得た関心'},
  activities: [
    {date:'2025.09 - 11', name:'MBSD Cybersecurity Challenges 2025', note:'選考課題'},
    {date:'2025.11', name:'総務省CTF2025'},
    {date:'2026.02', name:'防衛省CTF2026'},
    {date:'2026.04 - 05', name:'セキュリティ・キャンプ2026 全国大会', note:'応募課題'},
    {date:'2026.05', name:'0509 First Attack', note:'Micro Hardening V3'},
    {date:'2026.06', name:'Micro Hardening Basic'},
    {date:'2026.07', name:'Hardening Designers Conference 2026'},
  ],
  activityInsight: '脆弱性診断コンテストでは、初期侵入から診断、対策レポートの作成までを経験しました。攻撃手法とその対策に加え、相手へ伝わるレポート作成にも関心を持っています。',
};
