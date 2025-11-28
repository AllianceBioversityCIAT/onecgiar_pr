import { Injectable } from "@nestjs/common";
import { IntellectualPropertyExpert } from "../entities/intellectual_property_expert.entity";
import { Repository } from "typeorm";

@Injectable()
export class IntellectualPropertyExpertRepository extends Repository<IntellectualPropertyExpert> {

    async getIpExpertsEmailsByResultId(resultId: number) {
        return this.createQueryBuilder('rie')
            .select(['rie.email AS email'])
            .innerJoin('rie.organization', 'ci', 'ci.is_active = true')
            .innerJoin('ci.centers', 'cc')
            .innerJoin('cc.resultsCenters', 'rc', 'rc.is_active = true')
            .innerJoin('rc.result', 'r', 'r.is_active = true AND r.id = :resultId', { resultId })
            .where('rie.is_active = true')
            .getRawMany();
    }
}