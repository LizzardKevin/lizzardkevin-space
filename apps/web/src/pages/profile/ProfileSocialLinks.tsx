import { PROFILE_SOCIALS } from '../../content/profileContacts.ts';
import type { SupportedLanguage } from '../../i18n/resolveInitialLanguage.ts';
import { bilibiliPath, xiaohongshuPath } from '../../assets/social/marks.ts';


export function ProfileSocialLinks({account,language}:{account:'personal'|'band';language:SupportedLanguage}){
  const band=account==='band';
  const links=[
    {id:'xiaohongshu' as const,icon:xiaohongshuPath,name:language==='zh'?'小红书':'Xiaohongshu'},
    {id:'bilibili' as const,icon:bilibiliPath,name:language==='zh'?'哔哩哔哩':'Bilibili'},
  ];
  return <div className="profile-socials" aria-label={language==='zh'?(band?'乐队主页':'个人主页'):(band?'Band profiles':'Personal profiles')}>
    {links.map(link=>{
      const label=language==='zh'?`${band?'PeeKaBoo乐队':'个人主页'} · ${link.name}`:`${band?'PeeKaBoo band':'Personal profile'} · ${link.name}`;
      return <a key={link.id} className="profile-socials__link" href={PROFILE_SOCIALS[account][link.id]}
        target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="30" height="30"><path d={link.icon}/></svg>
      </a>;
    })}
  </div>;
}
