// Replace existing gen_passport_msg; do not leave duplicate definitions.
// Pass _u as the fourth argument at the normal clock_in_process call.
// Read-only: no registration, cache, Firestore writes or LINE sending.
function uatPassportTable_(uid, rows) {
  if (!uid || !rows || rows.length < 2) return '';
  var headers = rows[0].map(function(x) { return String(x).trim(); });
  var uidCol = headers.indexOf('LINE_UID');
  var tableCol = headers.indexOf('桌號');
  if (uidCol < 0 || tableCol < 0) return '';
  var matches = rows.slice(1).filter(function(row) { return String(row[uidCol]).trim() === String(uid); });
  if (matches.length !== 1) return '';
  var value = String(matches[0][tableCol] || '').trim();
  // Do not guess multi-table assignments, formula errors or free-form notes.
  var match = value.match(/^(?:第\s*)?([1-9]\d{0,3})\s*(?:桌|號)?$/);
  return match ? String(Number(match[1])) : '';
}

function gen_passport_msg(region, shop, name, uid) {
  var rows = [];
  if (uid && typeof sheet5 !== 'undefined') {
    try { rows = sheet5.getDataRange().getDisplayValues(); } catch (e) { rows = []; }
  }
  var tableNo = uatPassportTable_(uid, rows);
  var branch = String(shop || '').trim();
  var query = tableNo || branch;
  var uri = 'https://adamlien.github.io/zoss-tech/table_location.html' +
    (query ? '?q=' + encodeURIComponent(query) : '');
  var action = {type: 'uri', label: tableNo ? '桌次位置查詢' : '查看分店座位參考', uri: uri};
  var imageUrl = String(config.passport_img || '').trim();
  var validImage = /^https:\/\/[^\s/]+\/\S+$/.test(imageUrl);
  var values = [region, shop, name].map(function(x) { return String(x || '—'); });
  var body;
  if (validImage) {
    // 4:5 calibrated from supplied screenshot; native image metadata not verified.
    var image = {type: 'image', url: imageUrl, size: 'full', aspectMode: 'fit',
      aspectRatio: '4:5', action: action};
    var tops = ['44.2%', '52.3%', '60.5%'];
    var fields = values.map(function(value, index) {
      return {type: 'box', layout: 'vertical', position: 'absolute',
        offsetTop: tops[index], offsetStart: '46%', width: '40%', height: '5.2%',
        justifyContent: 'center', paddingAll: '0px',
        contents: [{type: 'text', text: value, color: '#171717',
          size: value.length > 8 ? '11px' : value.length > 5 ? '13px' : '16px',
          align: 'center', gravity: 'center', wrap: false, maxLines: 1}]};
    });
    body = {type: 'box', layout: 'vertical', paddingAll: '0px', backgroundColor: '#080808',
      contents: [image].concat(fields)};
  } else {
    body = {type: 'box', layout: 'vertical', spacing: 'md', backgroundColor: '#080808',
      contents: [{type: 'text', text: '報到證明', color: '#E8CD82', weight: 'bold', size: 'xl'}]
        .concat(values.map(function(value, index) {
          return {type: 'box', layout: 'horizontal', contents: [
            {type: 'text', text: ['區別','分店','姓名'][index], color: '#E8CD82', flex: 1},
            {type: 'text', text: value, color: '#FFFFFF', flex: 3, wrap: true}
          ]};
        }))};
  }
  return {type: 'bubble', size: 'giga', body: body,
    footer: {type: 'box', layout: 'vertical', spacing: 'sm', backgroundColor: '#080808',
      contents: [
        {type: 'text', text: tableNo ? '桌號：' + tableNo : '桌位尚未確認，請洽服務台',
          size: 'sm', color: '#E8CD82', align: 'center', wrap: true},
        {type: 'button', action: action, style: 'primary', color: '#625025', height: 'sm'},
        {type: 'text', text: '座位圖為配置參考，請以現場安排為準。', size: 'xs',
          color: '#B8B8B8', align: 'center', wrap: true}
      ]}};
}
