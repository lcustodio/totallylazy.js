import {cache, lazy} from "../lazy";
import {flatten, unique} from "../arrays";
import {characters, namedGroups, replace} from "../characters";
import {
    date,
    defaultOptions,
    formatData,
    hasNativeFormatToParts,
    Months,
    Options,
    Weekdays,
} from "./index";
import DateTimeFormatPart = Intl.DateTimeFormatPart;
import DateTimeFormatPartTypes = Intl.DateTimeFormatPartTypes;

export function parse(value: string, locale?: string, options?: string | Options, native = hasNativeFormatToParts): Date {
    return parser(locale, options, native).parse(value);
}

export class RegexBuilder {
    constructor(private locale: string,
                private options: Options = defaultOptions,
                private formatted: DateTimeFormatPart[]) {
    }

    @cache
    static create(locale: string = 'default', options: string | Options = defaultOptions, native = hasNativeFormatToParts): RegexBuilder {
        if (typeof options == 'string') {
            return formatBuilder(locale, options);
        } else {
            return new RegexBuilder(locale, options, formatData(new Date(), locale, options, native));
        }
    }

    @lazy get months(): Months {
        return Months.get(this.locale);
    }

    @lazy get weekdays(): Weekdays {
        return Weekdays.get(this.locale);
    }

    @lazy get regexParser(): RegexParser {
        const namedPattern = this.formatted.map(part => {
            switch (part.type) {
                case "year":
                    return '(?<year>\\d{4})';
                case "month":
                    return `(?<month>(?:\\d{1,2}|${this.months.pattern.toLocaleLowerCase(this.locale)}))`;
                case "day":
                    return '(?<day>\\d{1,2})';
                case "weekday":
                    return `(?<weekday>${this.weekdays.pattern.toLocaleLowerCase(this.locale)})`;
                default: {
                    const chars = unique(characters(this.ensureLiteralsAlwaysContainSpace(part))).join('').replace(' ', '\\s');
                    return `[${chars}]+?`;
                }
            }
        }).join("");

        const {names, pattern} = namedGroups(namedPattern);

        const groups = {
            year: numeric(names['year']),
            month: parseMonth(names['month'], this.months),
            day: numeric(names['day']),
            weekday: parseWeekday(names['weekday'], this.weekdays),
        };

        return new RegexParser(new RegExp(pattern), groups, this.locale);
    }

    private ensureLiteralsAlwaysContainSpace(part: DateTimeFormatPart) {
        return part.value + ' ';
    }
}

export interface DateParser {
    parse(value: string): Date;

    parseAll(value: string): Date[];
}

export class CompositeDateParser implements DateParser {
    constructor(private readonly parsers: DateParser[]) {
    }

    parse(value: string): Date {
        for (const parser of this.parsers) {
            try {
                const result = parser.parse(value);
                if (result) return result;
            } catch (ignore) {
            }
        }
        throw new Error("Unable to parse date: " + value);
    }

    parseAll(value: string): Date[] {
        return flatten(this.parsers.map( p => p.parseAll(value)));
    }
}

export function parsers(...parsers: DateParser[]): DateParser {
    return new CompositeDateParser(parsers);
}

export interface RegexGroups {
    year: OptionHandler;
    month: OptionHandler;
    day: OptionHandler;
    weekday: OptionHandler;
}

export class RegexParser implements DateParser {
    constructor(private regex: RegExp, private groups: RegexGroups, private locale?: string) {
    }

    parse(value: string): Date {
        const lower = value.toLocaleLowerCase(this.locale);
        const match = lower.match(this.regex);
        if (!match) throw new Error(`Locale "${this.locale}" generated regex ${this.regex} did not match "${lower}" `);
        return date(this.groups.year(match), this.groups.month(match), this.groups.day(match));
    }

    parseAll(value: string): Date[] {
        const regex = new RegExp(this.regex.source, 'g');
        const lower = value.toLocaleLowerCase(this.locale);
        const result: Date[] = [];
        while (true) {
            const match = regex.exec(lower);
            if(!match) break;
            result.push(date(this.groups.year(match), this.groups.month(match), this.groups.day(match)));
        }
        return result;
    }
}


export const formatRegex = /(?:(y+)|(M+)|(d+)|(E+))/g;

export function typeFrom(value: string): DateTimeFormatPartTypes {
    if (value.indexOf('y') != -1) return 'year';
    if (value.indexOf('M') != -1) return 'month';
    if (value.indexOf('d') != -1) return 'day';
    if (value.indexOf('E') != -1) return 'weekday';
    throw new Error(`Illegal Argument: ${value}`);
}

export function formatFrom(type: DateTimeFormatPartTypes, length: number): string {
    if (type === 'year') {
        if (length === 4) return "numeric";
        if (length === 2) return "2-digit";
    }
    if (type === 'month') {
        if (length === 4) return "long";
        if (length === 3) return "short";
        if (length === 2) return "2-digit";
        if (length === 1) return "numeric";
    }
    if (type === 'day') {
        if (length === 2) return "2-digit";
        if (length === 1) return "numeric";
    }
    if (type === 'weekday') {
        if (length === 4) return "long";
        if (length === 3) return "short";
    }
    throw new Error(`Illegal Argument: ${type} ${length}`);
}

export function partsFrom(format: string): DateTimeFormatPart[] {
    const parts: DateTimeFormatPart[] = [];
    replace(formatRegex, format, match => {
        const type = typeFrom(match[0]);
        const value = formatFrom(type, match[0].length);
        parts.push({type, value});
        return "";
    }, a => {
        if (a) parts.push({type: "literal", value: a});
        return "";
    });
    return parts;
}

export function optionsFrom(formatOrParts: string | DateTimeFormatPart[]): Options {
    const parts = typeof formatOrParts === "string" ? partsFrom(formatOrParts) : formatOrParts;
    const keys = ['year', 'month', 'day', 'weekday'];
    return parts.filter(p => keys.indexOf(p.type) != -1).reduce((a, p) => {
        a[p.type] = p.value;
        return a;
    }, {} as any);
}

export function formatBuilder(locale: string, format: string): RegexBuilder {
    const parts = partsFrom(format);

    return new RegexBuilder(locale, optionsFrom(parts), parts)
}

export type OptionHandler = (match: RegExpMatchArray) => number;

export const numeric = (index: number): OptionHandler => (match: RegExpMatchArray): number => {
    return parseInt(match[index]);
};

export const parseMonth = (index: number, months: Months): OptionHandler => (match: RegExpMatchArray): number => {
    return months.parse(match[index]).number;
};

export const parseWeekday = (index: number, weekdays: Weekdays): OptionHandler => (match: RegExpMatchArray): number => {
    return weekdays.parse(match[index]).number;
};

export const defaultParserOptions: (string | Options)[] = [
    {year: 'numeric', month: 'long', day: 'numeric', weekday: "long"},
    {year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'},
    {year: 'numeric', month: 'numeric', day: 'numeric'},
    {year: 'numeric', month: 'short', day: 'numeric'},
    {year: 'numeric', month: 'long', day: 'numeric'},
    "dd MMM yyyy",
];

export function parser(locale?: string, options?: string | Options, native = hasNativeFormatToParts): DateParser {
    if (typeof options == 'string') {
        return simpleParser(locale, options, native);
    } else {
        return localeParser(locale, options, native);
    }
}

export function simpleParser(locale: string = 'default', format: string, native = hasNativeFormatToParts): DateParser {
    return RegexBuilder.create(locale, format, native).regexParser;
}

export function localeParser(locale?: string, options?: string | Options, native = hasNativeFormatToParts): DateParser {
    if (!options) {
        return parsers(...defaultParserOptions.map(o => localeParser(locale, o, native)))
    }
    return RegexBuilder.create(locale, options, native).regexParser;
}

