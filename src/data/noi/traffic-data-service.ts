// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ListResponse } from "../ListResponse";
import { getAssetPath } from "../../utils/asset-path";
import { buildUrl } from "../../utils/url";
import { AnnouncementInfo, AnnouncementShortInfo } from "./AnnouncementInfo";


// origin is used to track usage and traffic patterns
const ORIGIN = 'webcomp-brennerlec';

export class TrafficDataService {

  getRoutePath() {
    const dataPath = getAssetPath('data_a22-1km.json');
    return fetch(dataPath)
      .then(r => r.json() as Promise<Array<{ lat: number, lng: number }>>);
  }

  getTrafficEvents() {
    const roadName = 'a22';
    // return fetch(buildUrl(`https://api.tourism.testingmachine.eu/v1/Announcement`, {
    return fetch(buildUrl(`https://tourism.api.opendatahub.com/v1/Announcement`, {
      origin: ORIGIN,
      pagenumber: 1,
      pagesize: -1,
      // rawfilter: `eq(Source,'${roadName}')`,
      rawfilter: `and(eq(Source,'${roadName}'),eq(LicenseInfo.ClosedData,false),isnull(EndTime))`,
      removenullvalues: true,
      getasidarray: false,
    }))
      .then(r => r.json() as Promise<ListResponse<AnnouncementInfo>>)
      .then(r => r.Items)
      .then(r => {
        return r
          .filter(v => !!v?.Geo?.position)
          .map(__convertToShortInfo);
      });
  }

}


function __convertToShortInfo(d: AnnouncementInfo): AnnouncementShortInfo {
  const eventIcon = _getIcon(d.TagIds);
  const direction = _getDirection(d) || _parseDirectionFromDescription(d);

  return {
    Id: d.Id,
    Geo: d.Geo,
    StartTime: d.StartTime,
    LastChange: d.LastChange,
    Detail: d.Detail,
    Shortname: d.Shortname,
    TagIds: d.TagIds,
    EventIcon: getAssetPath(eventIcon),
    EventIconAlt: eventIcon,
    // EventIcon: getAssetPath('16.png'), // TODO: icon will be updated
    Direction: direction,
  };
}


function _getDirection(d: AnnouncementInfo): AnnouncementShortInfo['Direction'] {

  const directionLC = d.Mapping?.ProviderA22Open?.Iddirezione?.toLowerCase();
  switch (directionLC) {
    case 'nord':
      return 'north';
    case 'sud':
      return 'south';
    case 'entrambe':
      return 'both';
    default:
      console.warn('Value is missing or unknown (Mapping.ProviderA22Open.Iddirezione):', directionLC, d);
      return null;
  }
}

function _parseDirectionFromDescription(d: AnnouncementInfo): AnnouncementShortInfo['Direction'] {
  const isNorth = d.Shortname.includes('North');
  const isSouth = d.Shortname.includes('South');
  const isBoth = d.Shortname.includes('Both');

  if (isNorth && !isSouth && !isBoth) {
    return 'north';
  }
  if (!isNorth && isSouth && !isBoth) {
    return 'south';
  }
  if (!isNorth && !isSouth && isBoth) {
    return 'both';
  }
  console.warn('Unable to detect direction: ', d);
  return null;
}


const _tagsIcon_default = 'icon-caution.svg';
const _tagsIcon_priority_high = {
  "traffic-event:accident": "icon-accident.svg",
  "traffic-event:animal-on-road": "icon-animal-on-road.svg",
  "traffic-event:caution": "icon-caution.svg",
  "traffic-event:closure": "icon-closure.svg",
  "traffic-event:congestion": "icon-congestion.svg",
  "traffic-event:current": "icon-info.svg",
  "traffic-event:event": "icon-info.svg",
  "traffic-event:hindrance": "icon-hindrance.svg",
  "traffic-event:maintenance": "icon-maintenance.svg",
  "traffic-event:mountain-pass": "icon-mountaian-pass.svg",
  "traffic-event:prohibition": "icon-prohibition.svg",
  "traffic-event:public-transport": "icon-public-transport.svg",
  "traffic-event:restriction": "icon-restiction.svg",
  "traffic-event:road-condition": "icon-road-condition.svg",
  "traffic-event:road-work": "icon-road-work.svg",
  "traffic-event:special": "icon-special.svg",
  "traffic-event:speed-camera": "icon-speed-camera.svg",
  "traffic-event:weather-related": "icon-weather-related.svg",
};

const _tagsIcon_priority_low = {
  "announcement:trail-closure": "icon-trail-closure.svg",
  "announcement:traffic-event": "icon-info.svg",
}

function _getIcon(tags: string[]): string {
  let icon: string | null = null;

  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    if (_tagsIcon_priority_high[tag]) {
      icon = _tagsIcon_priority_high[tag];
      break;
    }
  }

  if (!icon) {
    for (let i = tags.length - 1; i >= 0; i--) {
      const tag = tags[i];
      if (_tagsIcon_priority_low[tag]) {
        icon = _tagsIcon_priority_low[tag];
        break;
      }
    }
  }

  if (!icon) {
    console.warn('No icon found for tags: ', tags);
  }
  return icon || _tagsIcon_default;
}


