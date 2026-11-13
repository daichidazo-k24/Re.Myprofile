/** 編集する場所: PROJECTS / 制作物ボード。
 * 作品追加: 配列末尾へ {name,type,short,description,learning,tech,repo} を追加。
 * オプション項目: demo / demoPasswordNote。
 */
import {LINKS} from './links.js';

export const PROJECTS_CONTENT = {
  heading: '制作物',
  lead: '課題や興味を起点に、技術選定から実装・公開まで取り組んだ制作物です。',
  sectionTitles: {learning:'工夫・学び',tech:'使用技術'},
  projects: [
    {
      name:'DaichiPassword-ver.1',
      type:'Desktop Application',
      short:'RSA × AES パスワード管理',
      description:'RSAとAESのハイブリッド暗号方式を採用したパスワード管理ツールです。管理するパスワードが増えたことをきっかけに開発しました。',
      learning:'RSA暗号化を既存ライブラリに頼らず自力で実装し、暗号化ロジックへの理解を深めました。',
      tech:['Java','JavaFX','Maven','JSON','RSA','AES'],
      repo:LINKS.passwordRepo,
    },
    {
      name:'MAP',
      type:'Web Application',
      short:'沖縄限定・探索型ルートマップ',
      description:'ルート機能を備えた、探索型の沖縄限定MAPです。AIを活用しながら開発し、技術選定、環境変数の設定、細かな仕様調整は自分で行いました。',
      learning:'バイブコーディングで開発できる現在の限界を確認する目的で制作。機能改善とともに実装内容への理解を深めています。',
      tech:['TypeScript','Vite','Turf.js','Supabase','MapLibre GL JS','Cloudflare Workers','外部API'],
      repo:LINKS.mapRepo,
      demo:LINKS.mapDemo,
      demoPasswordNote:'Demoのアクセスパスワード: KBC（API利用制限のため）',
    },
    {
      name:'DAICHI PORTFOLIO WORLD',
      type:'3D Portfolio Web Site',
      short:'この3D自己紹介サイト',
      description:'従来の自己紹介ページを改良し、3Dワールドを探索しながら自己紹介や制作物を閲覧できるWebサイトを制作しました。',
      learning:'HTMLの連続スクロール、WebGLによる3D描画、GitHub Pagesでの静的サイト公開を組み合わせています。',
      tech:['HTML','CSS','JavaScript','WebGL','GitHub Pages'],
      repo:LINKS.portfolioRepo,
    },
  ],
};
