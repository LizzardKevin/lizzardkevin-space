import type { ProfileLink } from './lizzardKevinProfile.ts';
import type { SupportedLanguage } from '../i18n/resolveInitialLanguage.ts';

/** Account destinations supplied by the owner; personal and band accounts stay separate. */
export const PROFILE_SOCIALS={
  personal:{xiaohongshu:'https://xhslink.cn/o/3lcbtmnoGFJ',bilibili:'https://b23.tv/oljQPGn'},
  band:{xiaohongshu:'https://xhslink.cn/o/1F56Hmk7tBj',bilibili:'https://b23.tv/ApA9Nhc'},
} as const;

export function profileContactLinks(source:readonly ProfileLink[],language:SupportedLanguage):ProfileLink[]{
  const email=language==='zh'?'mailto:lizzardkevin@qq.com':'mailto:lizzardkevin@gmail.com';
  return [...source.filter(link=>!link.href?.startsWith('mailto:')||link.href===email)
    .map(link=>['Based in','现居'].includes(link.label)?{...link,label:language==='zh'?'所处':'Base',value:language==='zh'?'深圳':'Shenzhen'}:link),
    {label:language==='zh'?'小红书':'Xiaohongshu',value:language==='zh'?'个人主页':'Personal profile',href:PROFILE_SOCIALS.personal.xiaohongshu},
    {label:language==='zh'?'哔哩哔哩':'Bilibili',value:'光脚的大树',href:PROFILE_SOCIALS.personal.bilibili},
  ];
}
