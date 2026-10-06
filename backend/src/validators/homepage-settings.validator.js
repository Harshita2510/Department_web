import { z } from 'zod';

const text=(minimum,maximum)=>z.string().trim().min(minimum).max(maximum);
const highlight=z.object({value:text(1,20),label:text(2,60)}).strict();
const programOutcome=z.object({code:text(2,10),title:text(2,160),description:text(10,1500)}).strict();
export const homepageSettingsSchema=z.object({body:z.object({
  heroEyebrow:text(2,60),heroTitle:text(2,120),heroOverview:text(20,2000),
  highlights:z.array(highlight).length(3),
  imageCaptionTitle:text(2,100),imageCaptionSubtitle:text(2,120),
  departmentPhone:z.string().trim().min(6).max(30).regex(/^\+?[\d\s()-]+$/,'Enter a valid department phone number'),
  departmentEmail:z.email().trim().max(254).transform((value)=>value.toLowerCase()),
  visionHeading:text(2,120),visionText:text(20,1500),missionHeading:text(2,120),
  missionItems:z.array(text(10,1200)).min(1).max(6),
  programOutcomes:z.array(programOutcome).max(20)
}).strict()});
