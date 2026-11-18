/** 編集する場所: FISHING / 釣果ギャラリーの文章と写真の枚数。
 * 写真を増やす場合: imageCount を増やし FishingImage/fish31.jpg などを置く。
 */
export const FISHING_CONTENT = {
  title: 'Fishing Gallery',
  miniLabel: 'SECRET TREASURE / UNLOCKED',
  intro: 'このページでは釣れた魚の写真を公開しています。ぜひ見ていってください。',
  imageCount: 30,
  photoLabel: '釣果写真',
  // ファイル名ごとにひとことメモを設定。例: 'fish1.jpg': 'ようやく釣れた一匹。'
  // 空欄・未登録の画像にはメモを表示しません。
  photoNotes: {
    'fish1.jpg': '',
  },
};
