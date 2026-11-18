/** GraphicImage 内の作品を登録する場所。ポスター・ヘッダーとも縦横比を保って表示。
 * works に {file:'ギャラリー3/poster-01.jpg', title:'作品名', kind:'poster', description:'説明'} を追加。
 * フォルダ名から展示グループと画像比率を決定する。画像追加時は works にも登録する。
 * note に制作時の感想などを記入。例: note:'色の組み合わせにこだわりました。'。空欄では非表示。
 * kind は 'poster' または 'header'。file は GraphicImage からの相対パス。
 */
export const GRAPHIC_CONTENT={
 title:'Graphic Gallery',
 miniLabel:'POSTERS / HEADERS',
 intro:'趣味で制作したポスターやヘッダー画像です。作品をクリックすると拡大できます。',
 works:[
  {file:'ギャラリー1/image-03.png',title:'商品の広告',kind:'header',note:''},
  {file:'ギャラリー1/image-04.png',title:'ice Festivalとvanilaダサい；；',kind:'header',note:''},
  {file:'ギャラリー1/image-06.png',title:'ジョーカーイメージした！お気に入り',kind:'header',note:''},
  {file:'ギャラリー2/image-05.png',title:'LT会発表スライドの1枚目',kind:'header',note:''},
  {file:'ギャラリー2/image-07.png',title:'友達にスーパーラシードキックさせた',kind:'header',note:''},
  {file:'ギャラリー3/image-01.png',title:'一番伸びた作品！お気に入り',kind:'poster',note:''},
  {file:'ギャラリー3/image-02.png',title:'学校のコンテストで作った作品。雰囲気好き',kind:'poster',note:''},
  {file:'ギャラリー3/image-08.png',title:'公式からいいねもらった！',kind:'poster',note:''},
  {"file":"ギャラリー1/Ff6rcLzVQAAtp9A.jpg","title":"古の作品","kind":"header","note":""},
  {"file":"ギャラリー1/FfgIt8QUUAAVPl5.jpg","title":"古の作品","kind":"header","note":""},
  {"file":"ギャラリー1/Fhl3hY0VIAAQBbi.jpg","title":"古の作品。海外のレトロな文字をイメージした！","kind":"header","note":""},
  {"file":"ギャラリー2/FgtSbUJVQAAOwID.jpg","title":"古の作品。Valorantのポスター","kind":"header","note":""},
  {"file":"ギャラリー2/FykjRm9acAIWgyN.jpg","title":"古の作品。Valorantのポスター。vandalのフォント終わってる；；","kind":"header","note":""},
  {"file":"ギャラリー2/GDLaJ77aoAANL0P.jpg","title":"Omegastrikersのポスター","kind":"header","note":""},
  {"file":"ギャラリー2/GE2u6UDa0AAz8rh.jpg","title":"3位なった時のやつ！お気に入り","kind":"header","note":""},
  {"file":"ギャラリー3/FbAP6FRUYAAJGjG.jpg","title":"超古の作品。相変わらず文字ダサい；；中学生って感じ","kind":"poster","note":""},
  {"file":"ギャラリー3/GGFXQbWa4AAqSQO.jpg","title":"カードのデザイン的な？結構好き","kind":"poster","note":""},
  {"file":"ギャラリー3/GLc5_jXbQAEqf6K.jpg","title":"色合い好きだけど文字ダサい；；","kind":"poster","note":""},
 ],
};
export const GRAPHIC_GROUPS=[
 {id:'ギャラリー1',label:'ギャラリー1',format:'3:1'},
 {id:'ギャラリー2',label:'ギャラリー2',format:'16:9'},
 {id:'ギャラリー3',label:'ギャラリー3',format:'A4 ポスター'},
];
