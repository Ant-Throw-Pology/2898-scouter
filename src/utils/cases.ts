export const WORD_SEPARATOR = /[\s\-_]+/;
export const CAPS_WORD_SEPARATOR = /(?<![A-Z])(?=[A-Z])/;
export const CAPS_OR_NORMAL_WORD_SEPARATOR = /[\s\-_]+|(?<![A-Z])(?=[A-Z])/;
export const SENTENCE_SEPARATOR = /\b(?<punct>([\.\?\!\n]+\s*)+)\s+\b/;

// ChatGPT did this, not me
function splitWords(str: string, separator: RegExp | string = WORD_SEPARATOR): string[] {
    return str.split(separator);
}

function splitMatch(str: string, separator: RegExp | string): [string, RegExpMatchArray?][] {
    const results: [string, RegExpMatchArray?][] = [];
    let remaining = str;
    while (true) {
        const match = remaining.match(separator);
        if (!match) break;
        results.push([remaining.slice(0, match.index), match]);
        remaining = remaining.slice((match.index ?? 0) + match[0].length);
    }
    results.push([remaining]);
    return results;
}

/**
 * Lorem Ipsum Is Simply Dummy Text of the Printing and Typesetting Industry. Lorem Ipsum Has Been the Industry's Standard Dummy Text Ever Since the 1500s. It Has Survived Not Only Five Centuries, But Also the Leap Into Electronic Typesetting, Remaining Essentially Unchanged. It Was Popularised in the 1960s with the Release of Letraset Sheets Containing Lorem Ipsum Passages, and More Recently with Desktop Publishing Software Like Aldus Pagemaker Including Versions of Lorem Ipsum.
 */
export function toTitleCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const smallWords = ['and', 'of', 'to', 'the', 'a', 'in', 'on', 'with', 'for'];
    const words = splitWords(str, separator);

    return words.map((word, index) => {
        const lowerWord = word.toLowerCase();
        if (index === 0 || !smallWords.includes(lowerWord)) {
            return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
        }
        return lowerWord;
    }).join(' ');
}

/**
 * Lorem Ipsum Is Simply Dummy Text of the Printing and Typesetting Industry. Lorem Ipsum Has Been the Industry's Standard Dummy Text Ever Since the 1500s. It Has Survived Not Only Five Centuries, But Also the Leap Into Electronic Typesetting, Remaining Essentially Unchanged. It Was Popularised in the 1960s with the Release of Letraset Sheets Containing Lorem Ipsum Passages, and More Recently with Desktop Publishing Software Like Aldus Pagemaker Including Versions of Lorem Ipsum.
 */
export function toSentencedTitleCase(str: string, wordSeparator: RegExp | string = WORD_SEPARATOR, sentenceSeparator: RegExp | string = SENTENCE_SEPARATOR): string {
    return splitMatch(str, sentenceSeparator).map(([sentence, match]) => toTitleCase(sentence, wordSeparator) + ((match && (match?.groups?.punct ?? '.')) ?? '')).join(' ');
}

/**
 * Lorem Ipsum Is Simply Dummy Text Of The Printing And Typesetting Industry. Lorem Ipsum Has Been The Industry's Standard Dummy Text Ever Since The 1500s. It Has Survived Not Only Five Centuries, But Also The Leap Into Electronic Typesetting, Remaining Essentially Unchanged. It Was Popularised In The 1960s With The Release Of Letraset Sheets Containing Lorem Ipsum Passages, And More Recently With Desktop Publishing Software Like Aldus Pagemaker Including Versions Of Lorem Ipsum.
 */
export function toClickbaitTitleCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/**
 * Lorem Ipsum Is Simply Dummy Text Of The Printing And Typesetting Industry. Lorem Ipsum Has Been The Industry's Standard Dummy Text Ever Since The 1500s. It Has Survived Not Only Five Centuries, But Also The Leap Into Electronic Typesetting, Remaining Essentially Unchanged. It Was Popularised In The 1960s With The Release Of Letraset Sheets Containing Lorem Ipsum Passages, And More Recently With Desktop Publishing Software Like Aldus Pagemaker Including Versions Of Lorem Ipsum.
 */
export function toSentencedClickbaitTitleCase(str: string, wordSeparator: RegExp | string = WORD_SEPARATOR, sentenceSeparator: RegExp | string = SENTENCE_SEPARATOR): string {
    return splitMatch(str, sentenceSeparator).map(([sentence, match]) => toClickbaitTitleCase(sentence, wordSeparator) + ((match && (match?.groups?.punct ?? '.')) ?? '')).join(' ');
}

/**
 * Lorem ipsum is simply dummy text of the printing and typesetting industry. lorem ipsum has been the industry's standard dummy text ever since the 1500s. it has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. it was popularised in the 1960s with the release of letraset sheets containing lorem ipsum passages, and more recently with desktop publishing software like aldus pagemaker including versions of lorem ipsum.
 */
export function toSentenceCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    const sentence = words.join(' ').toLowerCase();
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of letraset sheets containing lorem ipsum passages, and more recently with desktop publishing software like aldus pagemaker including versions of lorem ipsum.
 */
export function toSentencedSentenceCase(str: string, wordSeparator: RegExp | string = WORD_SEPARATOR, sentenceSeparator: RegExp | string = SENTENCE_SEPARATOR): string {
    return splitMatch(str, sentenceSeparator).map(([sentence, match]) => toSentenceCase(sentence, wordSeparator) + ((match && (match?.groups?.punct ?? '.')) ?? '')).join(' ');
}

/**
 * LoReM IpSuM Is sImPlY DuMmY TeXt oF ThE PrInTiNg aNd tYpEsEtTiNg iNdUsTrY. lOrEm iPsUm hAs bEeN ThE InDuStRy's sTaNdArD DuMmY TeXt eVeR SiNcE ThE 1500S. iT HaS SuRvIvEd nOt oNlY FiVe cEnTuRiEs, BuT AlSo tHe lEaP InTo eLeCtRoNiC TyPeSeTtInG, rEmAiNiNg eSsEnTiAlLy uNcHaNgEd. It wAs pOpUlArIsEd iN ThE 1960S WiTh tHe rElEaSe oF LeTrAsEt sHeEtS CoNtAiNiNg lOrEm iPsUm pAsSaGeS, aNd mOrE ReCeNtLy wItH DeSkToP PuBlIsHiNg sOfTwArE LiKe aLdUs pAgEmAkEr iNcLuDiNg vErSiOnS Of lOrEm iPsUm.
 */
export function toSarcasticCase(str: string): string {
    return str.split('').map((char, index) => {
        return index % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
    }).join('');
}

/**
 * LoReM iPsUm Is SiMpLy DuMmY tExT oF tHe PrInTiNg AnD tYpEsEtTiNg InDuStRy. LoReM iPsUm HaS bEeN tHe InDuStRy'S sTaNdArD dUmMy TeXt EvEr SiNcE tHe 1500S. iT hAs SuRvIvEd NoT oNlY fIvE cEnTuRiEs, BuT aLsO tHe LeAp InTo ElEcTrOnIc TyPeSeTtInG, rEmAiNiNg EsSeNtIaLlY uNcHaNgEd. It WaS pOpUlArIsEd In ThE 1960s WiTh ThE rElEaSe Of LeTrAsEt ShEeTs CoNtAiNiNg LoReM iPsUm PaSsAgEs, AnD mOrE rEcEnTlY wItH dEsKtOp PuBlIsHiNg SoFtWaRe LiKe AlDuS pAgEmAkEr InClUdInG vErSiOnS oF lOrEm IpSuM.
 */
export function toAltSarcasticCase(str: string): string {
    let upper = true;
    return str.split('').map((char) => {
        const chl = char.toLowerCase();
        const chu = char.toUpperCase();
        const pp = upper;
        if (chl !== chu) upper = !upper;
        return pp ? char.toUpperCase() : char.toLowerCase();
    }).join('');
}

export function toRandomCase(str: string, random: () => number = Math.random): string {
    return str.split('').map((char) => {
        return random() < 0.5 ? char.toUpperCase() : char.toLowerCase();
    }).join('');
}

/**
 * LoremIpsumIsSimplyDummyTextOfThePrintingAndTypesettingIndustry.LoremIpsumHasBeenTheIndustry'sStandardDummyTextEverSinceThe1500s.ItHasSurvivedNotOnlyFiveCenturies,ButAlsoTheLeapIntoElectronicTypesetting,RemainingEssentiallyUnchanged.ItWasPopularisedInThe1960sWithTheReleaseOfLetrasetSheetsContainingLoremIpsumPassages,AndMoreRecentlyWithDesktopPublishingSoftwareLikeAldusPagemakerIncludingVersionsOfLoremIpsum.
 */
export function toPascalCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

/**
 * loremIpsumIsSimplyDummyTextOfThePrintingAndTypesettingIndustry.LoremIpsumHasBeenTheIndustry'sStandardDummyTextEverSinceThe1500s.ItHasSurvivedNotOnlyFiveCenturies,ButAlsoTheLeapIntoElectronicTypesetting,RemainingEssentiallyUnchanged.ItWasPopularisedInThe1960sWithTheReleaseOfLetrasetSheetsContainingLoremIpsumPassages,AndMoreRecentlyWithDesktopPublishingSoftwareLikeAldusPagemakerIncludingVersionsOfLoremIpsum.
 */
export function toCamelCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map((word, index) => {
        if (index === 0) {
            return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
}

/**
 * loremIpsumIsSimplyDummyTextOfThePrintingAndTypesettingIndustry. loremIpsumHasBeenTheIndustry'sStandardDummyTextEverSinceThe1500s. itHasSurvivedNotOnlyFiveCenturies,ButAlsoTheLeapIntoElectronicTypesetting,RemainingEssentiallyUnchanged. itWasPopularisedInThe1960sWithTheReleaseOfLetrasetSheetsContainingLoremIpsumPassages,AndMoreRecentlyWithDesktopPublishingSoftwareLikeAldusPagemakerIncludingVersionsOfLoremIpsum.
 */
export function toSentencedCamelCase(str: string, wordSeparator: RegExp | string = WORD_SEPARATOR, sentenceSeparator: RegExp | string = SENTENCE_SEPARATOR): string {
    return splitMatch(str, sentenceSeparator).map(([sentence, match]) => toCamelCase(sentence, wordSeparator) + ((match && (match?.groups?.punct ?? '.')) ?? '')).join(' ');
}

/**
 * lorem_ipsum_is_simply_dummy_text_of_the_printing_and_typesetting_industry._lorem_ipsum_has_been_the_industry's_standard_dummy_text_ever_since_the_1500s._it_has_survived_not_only_five_centuries,_but_also_the_leap_into_electronic_typesetting,_remaining_essentially_unchanged._it_was_popularised_in_the_1960s_with_the_release_of_letraset_sheets_containing_lorem_ipsum_passages,_and_more_recently_with_desktop_publishing_software_like_aldus_pagemaker_including_versions_of_lorem_ipsum.
 */
export function toSnakeCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toLowerCase()).join('_');
}

/**
 * lorem-ipsum-is-simply-dummy-text-of-the-printing-and-typesetting-industry.-lorem-ipsum-has-been-the-industry's-standard-dummy-text-ever-since-the-1500s.-it-has-survived-not-only-five-centuries,-but-also-the-leap-into-electronic-typesetting,-remaining-essentially-unchanged.-it-was-popularised-in-the-1960s-with-the-release-of-letraset-sheets-containing-lorem-ipsum-passages,-and-more-recently-with-desktop-publishing-software-like-aldus-pagemaker-including-versions-of-lorem-ipsum.
 */
export function toKebabCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toLowerCase()).join('-');
}

/**
 * LOREM_IPSUM_IS_SIMPLY_DUMMY_TEXT_OF_THE_PRINTING_AND_TYPESETTING_INDUSTRY._LOREM_IPSUM_HAS_BEEN_THE_INDUSTRY'S_STANDARD_DUMMY_TEXT_EVER_SINCE_THE_1500S._IT_HAS_SURVIVED_NOT_ONLY_FIVE_CENTURIES,_BUT_ALSO_THE_LEAP_INTO_ELECTRONIC_TYPESETTING,_REMAINING_ESSENTIALLY_UNCHANGED._IT_WAS_POPULARISED_IN_THE_1960S_WITH_THE_RELEASE_OF_LETRASET_SHEETS_CONTAINING_LOREM_IPSUM_PASSAGES,_AND_MORE_RECENTLY_WITH_DESKTOP_PUBLISHING_SOFTWARE_LIKE_ALDUS_PAGEMAKER_INCLUDING_VERSIONS_OF_LOREM_IPSUM.
 */
export function toTrainCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toUpperCase()).join('_');
}

/**
 * lOREM iPSUM IS SIMPLY DUMMY TEXT OF THE PRINTING AND TYPESETTING INDUSTRY. lOREM iPSUM HAS BEEN THE INDUSTRY'S STANDARD DUMMY TEXT EVER SINCE THE 1500S. iT HAS SURVIVED NOT ONLY FIVE CENTURIES, BUT ALSO THE LEAP INTO ELECTRONIC TYPESETTING, REMAINING ESSENTIALLY UNCHANGED. iT WAS POPULARISED IN THE 1960S WITH THE RELEASE OF lETRASET SHEETS CONTAINING lOREM iPSUM PASSAGES, AND MORE RECENTLY WITH DESKTOP PUBLISHING SOFTWARE LIKE aLDUS pAGEmAKER INCLUDING VERSIONS OF lOREM iPSUM.
 */
export function toInvertedCase(str: string): string {
    return str.split('').map(char => {
        return char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase();
    }).join('');
}

/**
 * lorem.ipsum.is.simply.dummy.text.of.the.printing.and.typesetting.industry..lorem.ipsum.has.been.the.industry's.standard.dummy.text.ever.since.the.1500s..it.has.survived.not.only.five.centuries,.but.also.the.leap.into.electronic.typesetting,.remaining.essentially.unchanged..it.was.popularised.in.the.1960s.with.the.release.of.letraset.sheets.containing.lorem.ipsum.passages,.and.more.recently.with.desktop.publishing.software.like.aldus.pagemaker.including.versions.of.lorem.ipsum.
 */
export function toDotCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toLowerCase()).join('.');
}

/**
 * lorem ipsum is simply dummy text of the printing and typesetting industry. lorem ipsum has been the industry's standard dummy text ever since the 1500s. it has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. it was popularised in the 1960s with the release of letraset sheets containing lorem ipsum passages, and more recently with desktop publishing software like aldus pagemaker including versions of lorem ipsum.
 */
export function toLowercaseSpaceCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toLowerCase()).join(' ');
}

/**
 * LOREM IPSUM IS SIMPLY DUMMY TEXT OF THE PRINTING AND TYPESETTING INDUSTRY. LOREM IPSUM HAS BEEN THE INDUSTRY'S STANDARD DUMMY TEXT EVER SINCE THE 1500S. IT HAS SURVIVED NOT ONLY FIVE CENTURIES, BUT ALSO THE LEAP INTO ELECTRONIC TYPESETTING, REMAINING ESSENTIALLY UNCHANGED. IT WAS POPULARISED IN THE 1960S WITH THE RELEASE OF LETRASET SHEETS CONTAINING LOREM IPSUM PASSAGES, AND MORE RECENTLY WITH DESKTOP PUBLISHING SOFTWARE LIKE ALDUS PAGEMAKER INCLUDING VERSIONS OF LOREM IPSUM.
 */
export function toUppercaseSpaceCase(str: string, separator: RegExp | string = WORD_SEPARATOR): string {
    const words = splitWords(str, separator);
    return words.map(word => word.toUpperCase()).join(' ');
}

export function copyCase(str: string, casing: boolean[] | ((index: number) => boolean)) {
    return str.split('').map((char, index) => {
        return (typeof casing == "function" ? casing(index) : casing[index % casing.length]) ? char.toUpperCase() : char.toLowerCase();
    }).join('');
}