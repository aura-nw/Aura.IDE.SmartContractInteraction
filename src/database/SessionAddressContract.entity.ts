import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class SessionAddressContract {
  @PrimaryGeneratedColumn() id: string;
  @Column() addressContract: string;
  @Column({ type: 'json' }) Client: any;
}
