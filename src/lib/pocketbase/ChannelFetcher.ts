import type { Channel } from "../../types/Channel";
import type { CreateData } from "../../types/PocketBaseCRUD";
import PocketBase from "./PocketBase";

export class ChannelFetcher {
  public static getChannelById(id: string): Promise<Channel | null> {
    return PocketBase.getFirstListEntity<Channel>({
      entityType: "channels",
      filter: [`discordId="${id}"`, {}],
    }).catch(() => null);
  }

  public static createChannelWithDiscordId(data: CreateData<Channel>): Promise<Channel> {
    return PocketBase.createEntity<Channel>({
      entityType: "channels",
      entityData: data,
    });
  }

  public static deleteChannelById(id: string): Promise<boolean> {
    return PocketBase.deleteEntity({
      entityType: "channels",
      filter: [`discordId="${id}"`, {}],
    });
  }

  public static updateChannelById(data: Channel): Promise<Channel> {
    return PocketBase.updateEntity<Channel>({
      entityType: "channels",
      entityData: data,
    });
  }
}
