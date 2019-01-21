import {assert} from 'chai';
import {runningInNode} from "../src/node";
import {date, different, format, months, Options, parse} from "../src/dates";

describe("dates", function () {
    before(function () {
        if (runningInNode() && process.env.NODE_ICU_DATA != './node_modules/full-icu') {
            console.log("To run these tests you must set 'NODE_ICU_DATA=./node_modules/full-icu'");
            this.skip();
        }
    });

    it('months are NOT zero based', function () {
        assert.equal(date(2000, 1, 2).toISOString(), '2000-01-02T00:00:00.000Z');
        assert.equal(date(2001, 2, 28).toISOString(), '2001-02-28T00:00:00.000Z');
    });

    it('can format and parse a date in many different locals', function () {
        const locales: string[] = ['en', 'de', 'fr', 'ja', 'nl', 'de-DE', 'en-US', 'en-GB', 'i-enochian', 'zh-Hant',
            'sr-Cyrl', 'sr-Latn', 'zh-cmn-Hans-CN', 'cmn-Hans-CN', 'zh-yue-HK', 'yue-HK',
            'sr-Latn-RS', 'sl-rozaj', 'sl-rozaj-biske', 'sl-nedis', 'de-CH-1901', 'sl-IT-nedis',
            'es-419', 'zh-Hans',  'zh-Hans-CN']; // 'hy-Latn-IT-arevela'
        const supported = Intl.DateTimeFormat.supportedLocalesOf(locales);

        for (const locale of supported) {
            const options: Options = {day: 'numeric', year: 'numeric', month: 'long', weekday:'long'};
            const original = date(2001, 6, 28);
            const formatted = format(original, locale, options);
            const parsed = parse(formatted, locale, options);
            assert.equal(parsed.toISOString(), original.toISOString(), locale);
        }
    });

    function assertFormat(locale: string, date: Date, options: Options, expected: string) {
        const formatted = format(date, locale, options);
        assert.equal(formatted, expected);
        assertParse(locale, expected, date, options);
    }

    function assertParse(locale: string, value: string, expected: Date, options?: Options) {
        const parsed = parse(value, locale, options);
        assert.equal(parsed.toISOString(), expected.toISOString());
    }

    it('can format and parse a specific date format', function () {
        assertFormat('en-GB', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'short', weekday: "short"}, 'Fri, 25 Jan 2019');
        assertFormat('en-GB', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'numeric', weekday: "long"}, 'Friday, 25/01/2019');
        assertFormat('en-US', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'short', weekday: "short"}, 'Fri, Jan 25, 2019');
        assertFormat('en-US', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'numeric', weekday: "long"}, 'Friday, 1/25/2019');
        assertFormat('nl', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'short', weekday: "short"}, 'vr 25 jan. 2019');
        assertFormat('nl', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'numeric', weekday: "long"}, 'vrijdag 25-1-2019');
        assertFormat('es', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'numeric', weekday: "long"}, 'viernes, 25/1/2019');
        assertFormat('de', date(2019, 1, 25), {day: 'numeric', year: 'numeric', month: 'long', weekday: "long"}, 'Freitag, 25. Januar 2019');


        assertFormat('es-ES', date(2019, 1, 31), {day: '2-digit', year: 'numeric', month: 'short'}, '31 ene. 2019');
        assertFormat('es-ES', date(2019, 2, 1), {day: '2-digit', year: 'numeric', month: 'short'}, '01 feb. 2019');

        assertFormat('ru-RU', date(2019, 1, 31), {day: '2-digit', year: 'numeric', month: 'short'}, '31 янв. 2019 г.');
        assertFormat('ru-RU', date(2019, 2, 1), {day: '2-digit', year: 'numeric', month: 'short'}, '01 февр. 2019 г.');
    });

    it("ignores case", () => {
        assertParse('es-ES', 'Martes, 15  Enero  2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('es-MX', 'Martes, 15  Enero  2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('fr-FR', 'Mardi 15 Janvier 2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('it-IT', 'Martedì 15 Gennaio 2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('pt-PT', 'Terça-feira, 15  Janeiro  2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
    });

    it('parsing is liberal in what it accepts', function () {
        assertParse('ru-RU', '31 янв 2019', date(2019, 1, 31), {day: '2-digit', year: 'numeric', month: 'short'});
        assertParse('de-DE', 'Dienstag, 15. Januar 2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('en-GB', '16 January 2019', date(2019, 1, 16), {day: 'numeric', year: 'numeric', month: 'long'});
        assertParse('en-US', 'Tuesday, January 15, 2019', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('en-IN', '12 Mar 2019', date(2019, 3, 12), {day: 'numeric', year: 'numeric', month: 'short'});

        assertParse('ko-KR', '2019년 1월 15일 화요일', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long', weekday: 'long'});
        assertParse('zh-TW', '2019年1月15日', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long'});
        assertParse('ja-JP', '2019年1月15日', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long'});

        // TODO
        // assertParse('ru-RU', '15 январь 2019 г.', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long'});
        assertParse('zh-CN', '2019年1月15日', date(2019, 1, 15), {day: 'numeric', year: 'numeric', month: 'long'});
    });

    it("can parse a date without specifying any options", () => {
        assertParse('en-GB', '18/12/2018', date(2018, 12, 18));
        assertParse('en-US', 'Monday, December 17, 2018', date(2018, 12, 17));
        assertParse('en-US', 'Sunday, January 20, 2019', date(2019, 1, 20));
        // TODO
        // assertParse('ru-RU', '15 январь 2019 г.', date(2019, 1, 15));
        assertParse('ru-RU', '31 янв 2019', date(2019, 1, 31));
        assertParse('ru-RU', 'пятница, 01 февр. 2019 г.', date(2019, 2, 1));
        assertParse('ru-RU', '01.2.2019', date(2019, 2, 1));
    });

    it("can get months for specific locals and formats", () => {
        const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        assert.deepEqual(months('en-GB'), englishMonths);
        assert.deepEqual(months('en-GB', 'long'), englishMonths);
        assert.deepEqual(months('en-GB', {month: 'long'}), englishMonths);
        assert.deepEqual(months('en-GB', {day: 'numeric', year: 'numeric', month: 'short', weekday: "short"}), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]);

        const standAloneRussianMonths: string[] = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
        assert.deepEqual(months('ru'), standAloneRussianMonths);
        assert.deepEqual(months('ru', 'long'), standAloneRussianMonths);
        assert.deepEqual(months('ru', {month: 'long'}), standAloneRussianMonths);

        const russianMonthsInContext: string[] = [  "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
        assert.deepEqual(months('ru', {year: "numeric", month: 'long', day:'numeric'}), russianMonthsInContext);
        assert.deepEqual(months('ru', {year: 'numeric', month: 'short', day: '2-digit'}),  ['янв','февр','мар','апр','мая','июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек']);


        const chineseMonths: string[] = [ "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
        assert.deepEqual(months('zh-CN'), chineseMonths);
        assert.deepEqual(months('zh-CN', 'long'), chineseMonths);
        assert.deepEqual(months('zh-CN', {month: 'long'}), chineseMonths);
    });

    it("formatting 2019/1/15 in zh-CN does not return the long month format but instead the numeric i.e 2019年1月15日", () => {
        assert.deepEqual(months('zh-CN', {day: 'numeric', year: 'numeric', month: 'long'}), ['1','2','3','4','5','6','7','8','9','10','11','12']);
    });

    it("can find differences between string", () => {
        const values =  ["2000年1月1日", "2000年2月1日", "2000年3月1日", "2000年4月1日", "2000年5月1日", "2000年6月1日", "2000年7月1日", "2000年8月1日", "2000年9月1日", "2000年10月1日", "2000年11月1日", "2000年12月1日"];
        assert.deepEqual(different(values), ['1','2','3','4','5','6','7','8','9','10','11','12']);

        const russianMonths = ['1 января 2000 г', '1 февраля 2000 г', '1 марта 2000 г', '1 апреля 2000 г', '1 мая 2000 г', '1 июня 2000 г', '1 июля 2000 г', '1 августа 2000 г', '1 сентября 2000 г', '1 октября 2000 г', '1 ноября 2000 г', '1 декабря 2000 г'];
        assert.deepEqual(different(russianMonths), ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']);

        const shortRussian = [ '01 янв. 2000 г.', '01 февр. 2000 г.', '01 мар. 2000 г.', '01 апр. 2000 г.', '01 мая 2000 г.', '01 июн. 2000 г.', '01 июл. 2000 г.', '01 авг. 2000 г.', '01 сент. 2000 г.', '01 окт. 2000 г.', '01 нояб. 2000 г.', '01 дек. 2000 г.' ];
        assert.deepEqual(different(shortRussian), ['янв.','февр.','мар.','апр.','мая','июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']);

        // TODO
        // const armenian = [ '01 հունվարի, 2000 թ', '01 փետրվարի, 2000 թ', '01 մարտի, 2000 թ', '01 ապրիլի, 2000 թ', '01 մայիսի, 2000 թ', '01 հունիսի, 2000 թ', '01 հուլիսի, 2000 թ', '01 օգոստոսի, 2000 թ', '01 սեպտեմբերի, 2000 թ', '01 հոկտեմբերի, 2000 թ', '01 նոյեմբերի, 2000 թ', '01 դեկտեմբերի, 2000 թ' ]
        // assert.deepEqual(different(armenian), ['հունվարի','փետրվարի','մարտի','ապրիլի','մայիսի','հունիսի', 'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի']);

    });

});