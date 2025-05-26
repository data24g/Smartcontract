#[starknet::contract]
mod BTECToken {
    use openzeppelin::token::erc20::ERC20Component;
    use starknet::ContractAddress;
    // use starknet::get caller address;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    impl ERC20HooksImpl of ERC20Component::ERC20HooksTrait<ContractState> {}
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC20CamelOnlyImpl = ERC20Component::ERC20CamelOnlyImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        fixed_supply: u256,
        recipient: ContractAddress, 
    ) {
        // Sử dụng trực tiếp giá trị để tránh unused variable warning
        self.erc20.initializer(name, symbol);
        self.erc20.mint(recipient, fixed_supply);
    }
}
